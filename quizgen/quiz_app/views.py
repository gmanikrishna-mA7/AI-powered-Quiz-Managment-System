from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .utils import generate_unique_quiz_id, append_quiz_to_csv
from .gemini_utils import generate_quiz_questions
from .models import Quiz, Question
from django.db import transaction
from django.contrib.auth.models import User
from auth_app.models import UserProfile
from auth_app.xp_utils import calculate_level
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class CreateQuizView(APIView):
    """
    Create a new quiz with AI-generated questions.
    Saves to CSV file for dataset collection.
    """
    permission_classes = [permissions.AllowAny]  # Dashboard is protected, so user is already logged in

    def post(self, request):
        # Get quiz details from request
        category = request.data.get('category')
        title = request.data.get('title')
        level = request.data.get('level', 'easy')
        num_questions = request.data.get('num_questions', 10)
        duration_seconds = request.data.get('duration_seconds', 600)
        additional_instructions = request.data.get('additional_instructions', '')
        
        # Validate required fields
        if not category or not title:
            return Response(
                {"error": "Category and title are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Step 1: Generate unique quiz_id
            logger.info(f"Generating quiz: {title} - {category}")
            quiz_id = generate_unique_quiz_id()
            logger.info(f"Generated quiz_id: {quiz_id}")
            
            # Step 2: Generate questions using Gemini
            logger.info(f"Calling Gemini API for {num_questions} questions")
            questions_data, error_msg = generate_quiz_questions(
                category=category,
                title=title,
                level=level,
                num_questions=num_questions,
                additional_instructions=additional_instructions
            )
            
            if not questions_data:
                logger.error(f"Gemini API failed: {error_msg}")
                return Response(
                    {"error": "Failed to generate questions", "details": error_msg},
                    status=status.HTTP_502_BAD_GATEWAY
                )
            
            logger.info(f"Successfully generated {len(questions_data)} questions")
            
            # Step 3: Create Quiz and Question objects for CSV
            with transaction.atomic():
                # Create quiz
                quiz = Quiz.objects.create(
                    quiz_id=quiz_id,
                    category=category,
                    title=title,
                    topic=category,
                    level=level,
                    difficulty_level=level,
                    num_questions=num_questions,
                    duration_seconds=duration_seconds,
                    duration_minutes=duration_seconds // 60,
                    created_by=request.user if request.user.is_authenticated else None,
                    is_mock=False
                )
                
                # Create question objects
                question_objects = []
                for idx, q_data in enumerate(questions_data, start=1):
                    question = Question(
                        quiz=quiz,
                        order=idx,
                        text=q_data['text'],
                        question_text=q_data['text'],
                        options=q_data['options'],
                        correct_answer=q_data['correct_answer'],
                        metadata={}
                    )
                    question_objects.append(question)
                
                # Save to database
                Question.objects.bulk_create(question_objects)
                
                # Step 4: Append to CSV file
                csv_success = append_quiz_to_csv(quiz, question_objects)
                if not csv_success:
                    logger.warning(f"CSV append failed for quiz {quiz_id}")
                else:
                    logger.info(f"Successfully saved quiz {quiz_id} to CSV")
            
            # Step 5: Return success response
            return Response({
                "success": True,
                "message": "Quiz created successfully",
                "quiz_id": quiz.quiz_id,
                "num_questions": len(question_objects),
                "category": quiz.category,
                "title": quiz.title,
                "level": quiz.level
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating quiz: {str(e)}")
            return Response(
                {"error": "Failed to create quiz", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class QuizListView(APIView):
    """
    Get list of all available quizzes with basic details.
    Cached for 10 minutes to improve performance.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            # Check cache first
            cached_quizzes = cache.get('explore_quiz_list')
            if cached_quizzes:
                logger.info("Returning cached quiz list")
                return Response({
                    'success': True,
                    'quizzes': cached_quizzes,
                    'count': len(cached_quizzes)
                }, status=status.HTTP_200_OK)

            quizzes_map = {}
            
            # 1. Fetch from Database
            db_quizzes = Quiz.objects.all().order_by('-created_at')
            for quiz in db_quizzes:
                quizzes_map[str(quiz.quiz_id)] = {
                    'quiz_id': str(quiz.quiz_id),
                    'title': quiz.title,
                    'category': quiz.category or quiz.topic,
                    'topic': quiz.topic,
                    'level': quiz.level or quiz.difficulty_level,
                    'num_questions': quiz.num_questions,
                    'duration_seconds': quiz.duration_seconds or (quiz.duration_minutes * 60 if quiz.duration_minutes else 600),
                    'created_at': quiz.created_at.isoformat() if quiz.created_at else None,
                    'language': quiz.language or 'English',
                    'source': 'database'
                }
            
            # 2. Fetch from ALL CSV files in dataset folder
            import csv
            import os
            
            dataset_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'dataset'
            )
            
            if os.path.exists(dataset_dir):
                # Iterate through all files in the directory
                for filename in os.listdir(dataset_dir):
                    if filename.endswith('.csv'):
                        csv_path = os.path.join(dataset_dir, filename)
                        try:
                            with open(csv_path, 'r', encoding='utf-8') as file:
                                reader = csv.DictReader(file)
                                # validation to ensure it has required columns
                                if not reader.fieldnames or 'QuizID' not in reader.fieldnames:
                                    continue
                                    
                                for row in reader:
                                    quiz_id = row.get('QuizID')
                                    if not quiz_id:
                                        continue
                                    
                                    if quiz_id not in quizzes_map:
                                        # New quiz found in CSV
                                        quizzes_map[quiz_id] = {
                                            'quiz_id': quiz_id,
                                            'title': row.get('Title', 'Untitled Quiz'),
                                            'category': row.get('Category', 'General'),
                                            'topic': row.get('Subtopic', row.get('Category', 'General')),
                                            'level': row.get('Level', 'Medium'),
                                            'num_questions': 1, # Initialize count
                                            'duration_seconds': int(row['DurationSeconds']) if row.get('DurationSeconds') and row['DurationSeconds'].isdigit() else 600,
                                            'created_at': None,
                                            'language': 'English', # Default for CSV
                                            'source': 'dataset'
                                        }
                                    elif quizzes_map[quiz_id]['source'] == 'dataset':
                                        # Increment count for CSV-only quizzes
                                        quizzes_map[quiz_id]['num_questions'] += 1
                        except Exception as e:
                            logger.error(f"Error reading CSV {filename}: {str(e)}")
                            continue
            
            # Convert to list
            quiz_list = list(quizzes_map.values())
            
            # Cache the result for 10 minutes (600 seconds)
            cache.set('explore_quiz_list', quiz_list, timeout=600)
            
            logger.info(f"Returning {len(quiz_list)} quizzes (DB+CSV)")
            return Response({
                'success': True,
                'quizzes': quiz_list,
                'count': len(quiz_list)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching quizzes: {str(e)}")
            return Response(
                {"error": "Failed to fetch quizzes", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QuizQuestionsView(APIView):
    """
    Get all questions for a specific quiz by quiz_id.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, quiz_id):
        try:
            # Get quiz by quiz_id
            quiz = Quiz.objects.filter(quiz_id=quiz_id).first()
            
            if not quiz:
                return Response(
                    {"error": "Quiz not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get all questions for this quiz
            questions = Question.objects.filter(quiz=quiz).order_by('order')
            
            questions_list = []
            for q in questions:
                questions_list.append({
                    'id': q.id,
                    'order': q.order,
                    'text': q.text or q.question_text,
                    'options': q.options,
                    'correct_answer': q.correct_answer
                })
            
            logger.info(f"Returning {len(questions_list)} questions for quiz {quiz_id}")
            return Response({
                'success': True,
                'quiz_id': quiz.quiz_id,
                'title': quiz.title,
                'category': quiz.category or quiz.topic,
                'level': quiz.level or quiz.difficulty_level,
                'duration_seconds': quiz.duration_seconds or (quiz.duration_minutes * 60 if quiz.duration_minutes else 600),
                'language': quiz.language or 'English',
                'questions': questions_list,
                'total_questions': len(questions_list)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching quiz questions: {str(e)}")
            return Response(
                {"error": "Failed to fetch quiz questions", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GetQuizzesByCategoryView(APIView):
    """
    Fetch unique quizzes by category and subtopic from categoryQuizzes.csv.
    Returns list of unique quiz_id with title and level.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import csv
        import os
        from collections import OrderedDict
        
        category = request.query_params.get('category')
        subtopic = request.query_params.get('subtopic')
        
        # Validate required parameters
        if not category or not subtopic:
            return Response(
                {"error": "Both category and subtopic are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create a safe cache key
            cache_key = f"cat_quizzes_{category.replace(' ', '_')}_{subtopic.replace(' ', '_')}"
            
            # Check cache
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info(f"Returning cached quizzes for {category}/{subtopic}")
                return Response(cached_data, status=status.HTTP_200_OK)

            # 1. Fetch from Database
            db_quizzes = Quiz.objects.filter(
                category__iexact=category,
                topic__iexact=subtopic
            ).order_by('-created_at')

            unique_quizzes = OrderedDict()
            
            # Add DB quizzes first
            for quiz in db_quizzes:
                if str(quiz.quiz_id) not in unique_quizzes:
                    unique_quizzes[str(quiz.quiz_id)] = {
                        'quiz_id': str(quiz.quiz_id),
                        'title': quiz.title,
                        'level': quiz.level or quiz.difficulty_level,
                        'language': quiz.language or 'English',
                        'source': 'database'
                    }

            # 2. Fetch from ALL CSV files in dataset folder
            dataset_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'dataset'
            )
            
            if os.path.exists(dataset_dir):
                for filename in os.listdir(dataset_dir):
                    if filename.endswith('.csv'):
                        csv_path = os.path.join(dataset_dir, filename)
                        try:
                            with open(csv_path, 'r', encoding='utf-8') as file:
                                reader = csv.DictReader(file)
                                # Basic validation
                                if not reader.fieldnames or 'QuizID' not in reader.fieldnames:
                                    continue
                                    
                                for row in reader:
                                    # Safe get for columns
                                    row_cat = row.get('Category', '').strip().lower()
                                    row_sub = row.get('Subtopic', '').strip().lower()
                                    target_cat = category.strip().lower()
                                    target_sub = subtopic.strip().lower()

                                    # Match category and subtopic
                                    if row_cat == target_cat and row_sub == target_sub:
                                        quiz_id = row['QuizID']
                                        
                                        # Add if not already present (DB takes precedence)
                                        if quiz_id not in unique_quizzes:
                                            unique_quizzes[quiz_id] = {
                                                'quiz_id': quiz_id,
                                                'title': row.get('Title', 'Untitled'),
                                                'level': row.get('Level', 'Medium'),
                                                'language': 'English', # Default for CSV
                                                'source': 'dataset'
                                            }
                        except Exception as e:
                            logger.error(f"Error reading CSV {filename}: {str(e)}")
                            continue
            
            # Convert to list
            quiz_list = list(unique_quizzes.values())
            
            response_data = {
                'success': True,
                'category': category,
                'subtopic': subtopic,
                'quizzes': quiz_list,
                'count': len(quiz_list)
            }
            
            # Cache the response data
            cache.set(cache_key, response_data, timeout=900)
            
            logger.info(f"Found {len(quiz_list)} unique quizzes for {category}/{subtopic}")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching quizzes: {str(e)}")
            return Response(
                {"error": "Failed to fetch quizzes", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CountQuizzesByCategoryView(APIView):
    """
    Count unique quizzes by category and subtopic from categoryQuizzes.csv.
    Returns the number of unique quizzes.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import csv
        import os
        
        category = request.query_params.get('category')
        subtopic = request.query_params.get('subtopic')
        
        # Validate required parameters
        if not category or not subtopic:
            return Response(
                {"error": "Both category and subtopic are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create a safe cache key
            cache_key = f"cat_count_{category.replace(' ', '_')}_{subtopic.replace(' ', '_')}"
            
            # Check cache
            cached_data = cache.get(cache_key)
            if cached_data:
                # logger.info(f"Returning cached count for {category}/{subtopic}")
                return Response(cached_data, status=status.HTTP_200_OK)

            # Using a set to track unique IDs
            unique_quiz_ids = set()

            # 1. Count from Database
            db_quizzes_ids = Quiz.objects.filter(
                category__iexact=category,
                topic__iexact=subtopic
            ).values_list('quiz_id', flat=True)
            
            for qid in db_quizzes_ids:
                unique_quiz_ids.add(str(qid))

            # 2. Count from ALL CSV files
            dataset_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'dataset'
            )
            
            if os.path.exists(dataset_dir):
                for filename in os.listdir(dataset_dir):
                    if filename.endswith('.csv'):
                        csv_path = os.path.join(dataset_dir, filename)
                        try:
                            with open(csv_path, 'r', encoding='utf-8') as file:
                                reader = csv.DictReader(file)
                                if not reader.fieldnames or 'QuizID' not in reader.fieldnames:
                                    continue
                                    
                                for row in reader:
                                    row_cat = row.get('Category', '').strip().lower()
                                    row_sub = row.get('Subtopic', '').strip().lower()
                                    target_cat = category.strip().lower()
                                    target_sub = subtopic.strip().lower()

                                    if row_cat == target_cat and row_sub == target_sub:
                                        unique_quiz_ids.add(row['QuizID'])
                        except Exception:
                            continue
            
            count = len(unique_quiz_ids)
            
            response_data = {
                'success': True,
                'category': category,
                'subtopic': subtopic,
                'count': count
            }
            
            # Cache the result
            cache.set(cache_key, response_data, timeout=900)
            
            logger.info(f"Found {count} unique quizzes for {category}/{subtopic}")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error counting quizzes: {str(e)}")
            return Response(
                {"error": "Failed to count quizzes", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GetQuizQuestionsByIdView(APIView):
    """
    Fetch quiz questions and answers by quiz_id from categoryQuizzes.csv.
    Returns all questions with their options and correct answers.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, quiz_id):
        import csv
        import os
        
        try:
            # Path to CSV file
            csv_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'dataset',
                'categoryQuizzes.csv'
            )
            
            if not os.path.exists(csv_path):
                return Response(
                    {"error": "Quiz dataset not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Read CSV and collect all questions for this quiz_id
            questions = []
            quiz_info = None
            
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    if row['QuizID'] == str(quiz_id):
                        # Store quiz info from first row
                        if not quiz_info:
                            quiz_info = {
                                'quiz_id': row['QuizID'],
                                'category': row['Category'],
                                'subtopic': row['Subtopic'],
                                'title': row['Title'],
                                'level': row['Level'],
                                'duration_seconds': row['DurationSeconds']
                            }
                        
                        # Add question
                        questions.append({
                            'question_text': row['QuestionText'],
                            'options': {
                                'A': row['OptionA'],
                                'B': row['OptionB'],
                                'C': row['OptionC'],
                                'D': row['OptionD']
                            },
                            'correct_answer': row['CorrectAnswer']
                        })
            
            # Check if quiz was found
            if not quiz_info:
                return Response(
                    {"error": "Quiz not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            logger.info(f"Found {len(questions)} questions for quiz {quiz_id}")
            return Response({
                'success': True,
                'quiz_info': quiz_info,
                'questions': questions,
                'total_questions': len(questions)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching quiz questions: {str(e)}")
            return Response(
                {"error": "Failed to fetch quiz questions", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GetLeaderboardView(APIView):
    """
    Get global leaderboard ranked by XP score.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            # Get all users with profiles
            all_users = User.objects.select_related('profile').all()
            
            processed_users = []
            
            for user in all_users:
                try:
                    profile = user.profile
                    # Check and reset weekly XP just in case
                    profile.check_and_reset_weekly_xp()
                    
                    level = calculate_level(profile.xp_score or 0)
                    
                    user_data = {
                        'user_id': user.id,
                        'username': user.username,
                        'full_name': user.get_full_name() or user.username,
                        'xp_score': profile.xp_score or 0,
                        'weekly_xp': profile.weekly_xp or 0,
                        'level': level,
                        'avatar': profile.avatar_file if hasattr(profile, 'avatar_file') and profile.avatar_file else None
                    }
                    processed_users.append(user_data)
                except UserProfile.DoesNotExist:
                    continue
            
            # 1. Global Leaderboard
            global_sorted = sorted(processed_users, key=lambda x: x['xp_score'], reverse=True)
            for idx, u in enumerate(global_sorted, 1):
                u['rank'] = idx # Add global rank
            
            top_100 = global_sorted[:100]
            
            # 2. Weekly Leaderboard
            weekly_sorted = sorted(processed_users, key=lambda x: x['weekly_xp'], reverse=True)
            weekly_top_10 = []
            for idx, u in enumerate(weekly_sorted, 1):
                # We create a copy or modify a new dict for weekly entry to have weekly rank
                weekly_entry = u.copy()
                weekly_entry['rank'] = idx
                if len(weekly_top_10) < 10:
                    weekly_top_10.append(weekly_entry)
            
            # Current user ranks
            current_user_overall_rank = None
            current_user_weekly_rank = None
            
            if request.user.is_authenticated:
                for u in global_sorted:
                    if u['user_id'] == request.user.id:
                        current_user_overall_rank = u['rank']
                        break
                # For weekly rank, we need to find in weekly_sorted
                for idx, u in enumerate(weekly_sorted, 1):
                    if u['user_id'] == request.user.id:
                        current_user_weekly_rank = idx
                        break

            return Response({
                'success': True,
                'data': {
                    'overall_top_100': top_100,
                    'weekly_top_10': weekly_top_10,
                    'total_users': len(processed_users),
                    'current_user_overall_rank': current_user_overall_rank,
                    'current_user_weekly_rank': current_user_weekly_rank
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching leaderboard: {str(e)}")
            return Response(
                {'error': 'Failed to fetch leaderboard', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class GetQuizDetailView(APIView):
    """
    Unified API to fetch quiz details by quiz_id.
    Prioritizes CSV dataset, falls back to Database.
    Returns standardized quiz object with questions.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, quiz_id):
        import csv
        import os
        
        # 1. Search in ALL CSV files (Primary Source for dataset quizzes)
        try:
            dataset_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'dataset'
            )
            
            if os.path.exists(dataset_dir):
                for filename in os.listdir(dataset_dir):
                    if filename.endswith('.csv'):
                        csv_path = os.path.join(dataset_dir, filename)
                        try:
                            questions = []
                            quiz_metadata = None
                            
                            with open(csv_path, 'r', encoding='utf-8') as file:
                                reader = csv.DictReader(file)
                                # Basic validation
                                if not reader.fieldnames or 'QuizID' not in reader.fieldnames:
                                    continue

                                for row in reader:
                                    if row['QuizID'] == str(quiz_id):
                                        # Capture metadata from the first row found
                                        if not quiz_metadata:
                                            quiz_metadata = {
                                                'quiz_id': row['QuizID'],
                                                'title': row.get('Title', 'Untitled Quiz'),
                                                'category': row.get('Category', 'General'),
                                                'subtopic': row.get('Subtopic', row.get('Category', 'General')),
                                                'level': row.get('Level', 'Medium'),
                                                'level': row.get('Level', 'Medium'),
                                                'duration_seconds': int(row['DurationSeconds']) if row.get('DurationSeconds') and row['DurationSeconds'].isdigit() else 600,
                                                'language': 'English', # Default for CSV
                                                'source': 'dataset'
                                            }
                                        
                                        # Add question
                                        questions.append({
                                            'text': row.get('QuestionText', ''),
                                            'options': {
                                                'A': row.get('OptionA', ''),
                                                'B': row.get('OptionB', ''),
                                                'C': row.get('OptionC', ''),
                                                'D': row.get('OptionD', '')
                                            },
                                            'correct_answer': row.get('CorrectAnswer', '')
                                        })
                            
                            if quiz_metadata:
                                logger.info(f"Quiz {quiz_id} found in CSV: {filename}")
                                return Response({
                                    'success': True,
                                    'data': {
                                        **quiz_metadata,
                                        'questions': questions,
                                        'total_questions': len(questions)
                                    }
                                }, status=status.HTTP_200_OK)
                                
                        except Exception as e:
                            logger.error(f"Error reading CSV {filename}: {str(e)}")
                            continue
        
        except Exception as e:
            logger.error(f"Error searching CSVs for quiz {quiz_id}: {str(e)}")
            # Continue to DB search if CSV fails

        # 2. Search in Database (Fallback for generated quizzes)
        try:
            quiz = Quiz.objects.filter(quiz_id=quiz_id).first()
            if quiz:
                questions_qs = Question.objects.filter(quiz=quiz).order_by('order')
                questions_list = []
                for q in questions_qs:
                    questions_list.append({
                        'id': q.id,
                        'text': q.text or q.question_text,
                        'options': q.options,
                        'correct_answer': q.correct_answer
                    })
                
                logger.info(f"Quiz {quiz_id} found in Database.")
                return Response({
                    'success': True,
                    'data': {
                        'quiz_id': quiz.quiz_id,
                        'title': quiz.title,
                        'category': quiz.category or quiz.topic,
                        'subtopic': quiz.topic, # topic is often used as subtopic equivalent for DB quizzes
                        'level': quiz.level or quiz.difficulty_level,
                        'level': quiz.level or quiz.difficulty_level,
                        'num_questions': quiz.num_questions,
                        'duration_seconds': quiz.duration_seconds or (quiz.duration_minutes * 60 if quiz.duration_minutes else 600),
                        'created_at': quiz.created_at.isoformat() if quiz.created_at else None,
                        'language': quiz.language or 'English',
                        'source': 'database',
                        'questions': questions_list,
                        'total_questions': len(questions_list)
                    }
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error searching DB for quiz {quiz_id}: {str(e)}")
            return Response(
                {"error": "Failed to fetch quiz details", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 3. Not found
        return Response(
            {"error": "Quiz not found"},
            status=status.HTTP_404_NOT_FOUND
        )