import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from .models import GameSession

class QuizConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f'quiz_{self.room_code}'
        self.user = self.scope["user"]
        self.is_host = False

        # Only allow authenticated users
        if not self.user.is_authenticated:
            await self.close()
            return

        # Check if user is host
        self.is_host = await self.check_is_host()

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Handle player join (Host is also a player)
        await self.handle_player_join()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # If host leaves, end game for everyone
        # If host leaves, end game for everyone
        if self.is_host:
            # Commenting out for stability during dev (React Strict Mode triggers disconnects)
            pass
            # await self.channel_layer.group_send(
            #     self.room_group_name,
            #     {
            #         'type': 'game_over',
            #         'leaderboard': [],
            #         'reason': 'Host disconnected'
            #     }
            # )
            # # Cleanup state
            # await self.update_session_status('finished')

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'start_game':
            if self.is_host:
                asyncio.create_task(self.run_game_loop())
        elif action == 'submit_answer':
            await self.handle_answer_submission(data)
            
    async def run_game_loop(self):
        """
        Automated game loop: 
        1. Start Game
        2. For each Question:
           - Broadcast Question (15s)
           - Wait 15s
           - Broadcast Intermission/Next (5s)
           - Wait 5s
        3. End Game
        """
        await self.update_session_status('active')
        
        # Broadcast start
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'game_start'}
        )
        
        # Give a small buffer before first question
        await asyncio.sleep(2)
        
        # Loop through questions (Hardcoded 5 for now, logic matched request)
        # Ideally fetch real questions from DB for the quiz attached to session
        questions = await self.get_questions()
        
        for idx, question in enumerate(questions):
            # 1. Question Phase (15s)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'new_question',
                    'question': question,
                    'timer': 15,
                    'current_index': idx + 1,
                    'total_questions': len(questions)
                }
            )
            
            # Reset local state for question (e.g. allowing answers) happens on client 
            # We wait 15 seconds + 2 seconds buffer for network/client sync
            # This ensures client timer hits 0 before we move on
            await asyncio.sleep(17)
                
            # 2. Intermission Phase (5s) - Only if not last question
            if idx < len(questions) - 1:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'intermission',
                        'timer': 5,
                        'message': 'Next question coming up...'
                    }
                )
                await asyncio.sleep(5)
        
        # End Game
        await self.end_game()

    async def handle_player_join(self):
        players = await self.add_player_to_session()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_update',
                'players': players
            }
        )

    async def end_game(self):
        leaderboard = await self.finish_game_and_award_xp()
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_over',
                'leaderboard': leaderboard
            }
        )

    @database_sync_to_async
    def finish_game_and_award_xp(self):
        from .models import GameSession, PlayerSession
        from auth_app.models import UserProfile
        from django.contrib.auth.models import User
        from django.utils import timezone
        from django.db.models import F

        key = f"live_quiz_{self.room_code}_players"
        players = cache.get(key, [])
        
        # Sort by score descending for leaderboard
        players.sort(key=lambda x: x['score'], reverse=True)
        
        try:
            session = GameSession.objects.get(join_code=self.room_code)
            session.status = 'finished'
            session.completed_at = timezone.now()
            session.save()

            # Rank Logic
            current_rank = 1
            for i, player_data in enumerate(players):
                 # Handle Ties
                if i > 0 and player_data['score'] < players[i-1]['score']:
                    current_rank = i + 1
                
                player_data['rank'] = current_rank
                
                # Retrieve User
                try:
                    user = User.objects.get(username=player_data['username'])
                    
                    # XP Logic
                    xp_gained = 0
                    if player_data.get('is_host'):
                         xp_gained += 15
                    else:
                         xp_gained += 10
                         
                    if current_rank == 1:
                        xp_gained += 10
                    
                    player_data['xp_earned'] = xp_gained

                    # Update UserProfile XP
                    # Use F expression to avoid race conditions if multiple games finish at once
                    if hasattr(user, 'profile'):
                        user.profile.xp_score = F('xp_score') + xp_gained
                        user.profile.save()

                    # Save PlayerSession History
                    PlayerSession.objects.filter(
                        game_session=session,
                        user=user
                    ).update(
                        score=player_data['score'],
                        rank=current_rank,
                        xp_earned=xp_gained
                    )

                except User.DoesNotExist:
                     continue
            
            # Clear cache
            cache.delete(key)
            cache.delete(f"live_quiz_{self.room_code}_status")
            
            return players
            
        except GameSession.DoesNotExist:
            return players

    async def handle_answer_submission(self, data):
        score_delta = data.get('score_delta', 0)
        await self.update_player_score(score_delta)

    # --- Handlers for Group Messages ---

    async def player_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def game_start(self, event):
        await self.send(text_data=json.dumps(event))

    async def new_question(self, event):
        await self.send(text_data=json.dumps(event))
        
    async def intermission(self, event):
         await self.send(text_data=json.dumps({
            'type': 'intermission',
            'timer': event['timer'],
            'message': event['message']
        }))

    async def game_over(self, event):
        await self.send(text_data=json.dumps(event))

    # --- Database / Helper Methods ---
    
    @database_sync_to_async
    def check_is_host(self):
        try:
            session = GameSession.objects.get(join_code=self.room_code)
            return session.host == self.user
        except GameSession.DoesNotExist:
            return False
            
    @database_sync_to_async
    def get_questions(self):
        try:
            session = GameSession.objects.get(join_code=self.room_code)
            if not session.quiz_source:
                 # Fallback if no quiz attached (shouldn't happen with new logic)
                 return [
                    {"id": 1, "text": "What is the capital of France?", "options": ["Paris", "London", "Berlin", "Madrid"], "answer": "Paris"},
                    {"id": 2, "text": "Which planet is known as the Red Planet?", "options": ["Mars", "Venus", "Jupiter", "Saturn"], "answer": "Mars"}
                 ]
            
            questions = list(session.quiz_source.questions.all().order_by('order'))
            return [
                {
                    "id": q.id,
                    "text": q.text,
                    "options": q.options,
                    "answer": q.correct_answer
                }
                for q in questions
            ]
        except GameSession.DoesNotExist:
            return []

    @database_sync_to_async
    def add_player_to_session(self):
        key = f"live_quiz_{self.room_code}_players"
        players = cache.get(key, [])
        
        # Check if player exists
        if not any(p['username'] == self.user.username for p in players):
            # Safe profile access
            full_name = self.user.username
            if hasattr(self.user, 'profile'):
                full_name = self.user.profile.full_name or self.user.username

            players.append({
                'username': self.user.username,
                'name': full_name,
                'score': 0,
                'is_host': self.is_host
            })
            cache.set(key, players, timeout=3600)
        
        return players

    @database_sync_to_async
    def update_player_score(self, delta):
        key = f"live_quiz_{self.room_code}_players"
        players = cache.get(key, [])
        for p in players:
            if p['username'] == self.user.username:
                p['score'] += delta
                break
        cache.set(key, players, timeout=3600)

    @database_sync_to_async
    def update_session_status(self, status):
        key = f"live_quiz_{self.room_code}_status"
        cache.set(key, status, timeout=3600)
            
    @database_sync_to_async
    def get_leaderboard(self):
        key = f"live_quiz_{self.room_code}_players"
        players = cache.get(key, [])
        return sorted(players, key=lambda x: x['score'], reverse=True)
