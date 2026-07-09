import json
import random
from datetime import timedelta
from django.utils import timezone
from quiz_app.models import Activity, ActivityQuestion
from quiz_app.gemini_utils import generate_content_with_gemini

class ActivityGenerator:
    def generate_daily_activities(self):
        """Generates activities for the next 7 days if they don't exist."""
        today = timezone.now().date()
        for i in range(8):  # Today + 7 days
            target_date = today + timedelta(days=i)
            print(f"Checking activities for {target_date}...")
            # Buzzer removed as per request
            self._ensure_activity(target_date, 'lightning', self._generate_lightning_content)
            self._ensure_activity(target_date, 'scramble', self._generate_scramble_content)
            self._ensure_activity(target_date, 'two_truths', self._generate_two_truths_content)

    def _ensure_activity(self, date, type, generator_func):
        # Check if activity exists
        existing = Activity.objects.filter(date=date, type=type).first()
        
        if existing:
            if existing.questions.count() == 0:
                print(f"  Found empty {type} for {date}, regenerating...")
                existing.delete()
            else:
                return # Already exists and has questions

        print(f"  Generating {type} for {date}...")
        
        # Create activity first
        activity = Activity.objects.create(
            date=date,
            type=type,
            title=f"Daily {type.title().replace('_', ' ')}",
            difficulty='medium'
        )

        questions_data = None
        try:
            questions_data = generator_func()
        except Exception as e:
            print(f"  !! AI Generation failed for {type}: {e}")
        
        # Use fallback if AI failed or returned empty
        if not questions_data:
            print(f"  -> Using fallback content for {type}")
            questions_data = self._get_fallback_content(type)

        try:
            for idx, q_data in enumerate(questions_data):
                ActivityQuestion.objects.create(
                    activity=activity,
                    content=q_data,
                    correct_answer=q_data.get('answer', str(q_data.get('a', ''))),
                    points=10,
                    order=idx
                )
            print(f"  -> Created {activity} with {len(questions_data)} questions")
        except Exception as e:
            print(f"  !! Error saving questions for {type}: {str(e)}")
            activity.delete()

    def _get_fallback_content(self, type):
        """Returns hardcoded fallback content when AI fails."""
        if type == 'lightning':
            return [
                {"q": "Fastest land animal?", "o": ["Cheetah", "Lion"], "a": 0},
                {"q": "Capital of Japan?", "o": ["Beijing", "Tokyo"], "a": 1},
                {"q": "Is fire hot?", "o": ["Yes", "No"], "a": 0},
                {"q": "Colors in rainbow?", "o": ["7", "8"], "a": 0},
                {"q": "Opposite of up?", "o": ["Down", "Left"], "a": 0},
                {"q": "Is the earth flat?", "o": ["Yes", "No"], "a": 1},
                {"q": "Freezing point of water?", "o": ["0C", "100C"], "a": 0},
                {"q": "Humans have how many legs?", "o": ["2", "4"], "a": 0},
                {"q": "Sun rises in?", "o": ["East", "West"], "a": 0},
                {"q": "2 + 2 = ?", "o": ["4", "5"], "a": 0}
            ]
        elif type == 'scramble':
            return [
                {"word": "PYTHON", "hint": "A programming language"},
                {"word": "DJANGO", "hint": "A web framework"},
                {"word": "REACT", "hint": "A JS library"},
                {"word": "SERVER", "hint": "Hosts websites"},
                {"word": "DATABASE", "hint": "Stores data"}
            ]
        elif type == 'two_truths':
            return [
                {"topic": "Geography", "options": [{"id": 1, "text": "Kyoto was once capital of Japan", "isLie": False}, {"id": 2, "text": "Africa is a country", "isLie": True, "explanation": "Africa is a continent."}, {"id": 3, "text": "The Nile is a long river", "isLie": False}]},
                {"topic": "Animals", "options": [{"id": 1, "text": "Sharks have bones", "isLie": True, "explanation": "Sharks have cartilage."}, {"id": 2, "text": "Octopuses have 3 hearts", "isLie": False}, {"id": 3, "text": "Cows can sleep standing up", "isLie": False}]}
            ]
        return []

    def _generate_lightning_content(self):
        prompt = """
        Generate 15 rapid-fire trivia questions for a 'Lightning Round'.
        Format: JSON array of objects with keys: "q" (question), "o" (array of 2 short options), "a" (index of correct option 0 or 1).
        Questions should be very short reading time.
        """
        response = generate_content_with_gemini(prompt)
        print(f"DEBUG: Lightning Raw Response: {response[:100]}...")
        # Transform for DB consistency if needed, but model stores flexible JSON
        return json.loads(response)

    def _generate_scramble_content(self):
        prompt = """
        Generate 10 words for a 'Word Scramble' game.
        Format: JSON array of objects with keys: "word" (uppercase string), "hint" (short clue).
        Words should be 5-10 letters long.
        """
        response = generate_content_with_gemini(prompt)
        return json.loads(response)

    def _generate_two_truths_content(self):
        prompt = """
        Generate 5 rounds of 'Two Truths and a Lie'.
        Format: JSON array of objects with keys: 
        "topic" (string), 
        "options" (array of 3 objects: { "id": 1, "text": "...", "isLie": boolean, "explanation": "..." }).
        Ensure exactly one option is the lie (isLie: true).
        """
        response = generate_content_with_gemini(prompt)
        return json.loads(response)
