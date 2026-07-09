// API Base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Helper to get WebSocket URL
export const getWebSocketUrl = (endpoint: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // If API_BASE_URL is relative or just a host, handle appropriately. 
  // Assuming API_BASE_URL is full URL like http://localhost:8000
  const host = API_BASE_URL.replace(/^http(s)?:\/\//, "");
  return `${protocol}//${host}/${endpoint}`;
};

// Type definitions
export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  username?: string;
  avatar?: string;
  avatar_file?: string;
  bio?: string;
  preferences?: {
    interests?: string[];
    [key: string]: any;
  };
  is_email_verified: boolean;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

class ApiService {
  private baseURL: string;
  public onUnauthorized: (() => void) | null = null;

  constructor() {
    this.baseURL = `${API_BASE_URL}/api/auth`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: "include",
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (response.status === 401) {
        if (this.onUnauthorized) {
          this.onUnauthorized();
        }
      }

      if (!response.ok) {
        throw data;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw {
          success: false,
          message: error.message,
          errors: { detail: [error.message] },
        };
      }
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>("/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>("/register/", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<ApiResponse<null>> {
    return this.request<null>("/logout/", {
      method: "POST",
    });
  }

  async checkAuth(): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>("/check/", {
      method: "GET",
    });
  }

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>("/profile/", {
      method: "GET",
    });
  }

  async googleSignIn(token: string, mode: 'login' | 'register' = 'register'): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>("/google-signin/", {
      method: "POST",
      body: JSON.stringify({ token, mode }),
    });
  }

  async uploadAvatar(file: File): Promise<ApiResponse<UserProfile>> {
    const formData = new FormData();
    formData.append("avatar", file);

    const url = `${this.baseURL}/profile/avatar/`;
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return response.json();
  }

  async updateProfile(data: {
    full_name?: string;
    bio?: string;
    preferences?: any;
  }): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>("/profile/update/", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async createQuiz(data: {
    category: string;
    title: string;
    level: "easy" | "medium" | "hard";
    num_questions: number;
    duration_seconds: number;
    additional_instructions?: string;
    language?: string;
  }): Promise<ApiResponse<any>> {
    const token = localStorage.getItem("token");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/quiz/create/`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Quiz creation failed");
    }

    const result = await response.json();
    return result.data
      ? result
      : {
        success: true,
        message: "OK",
        data: result,
      };
  }

  async getQuizList(): Promise<ApiResponse<{ quizzes: any[]; count: number }>> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/list/`);
    if (!response.ok) throw new Error("Failed to fetch quizzes");
    return response.json();
  }

  async getQuizQuestions(quizId: string): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/api/quiz/${quizId}/questions/`
    );
    if (!response.ok) throw new Error("Failed to fetch quiz questions");
    return response.json();
  }

  async saveQuizAttempt(
    quizId: string,
    selectedAnswers: any,
    timeTaken: number,
    quizType?: string
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/auth/quiz/attempt/save/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        quiz_id: quizId,
        selected_answers: selectedAnswers,
        time_taken: timeTaken,
        quiz_type: quizType || 'time-based',
      }),
    });

    if (!response.ok) throw new Error("Failed to save quiz attempt");
    return response.json();
  }

  async getHistorySummary(): Promise<ApiResponse<any>> {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/auth/quiz/history/summary/`,
      {
        method: "GET",
        headers,
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Failed to fetch history summary");
    return response.json();
  }

  async getQuizHistory(): Promise<ApiResponse<any>> {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/quiz/history/`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch quiz history");
    return response.json();
  }

  async getQuizHistoryById(attemptId: number): Promise<ApiResponse<any>> {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/auth/quiz/history/${attemptId}/`,
      {
        method: "GET",
        headers,
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Failed to fetch quiz attempt");
    return response.json();
  }

  async getCategoryPerformance(): Promise<ApiResponse<any>> {
    return this.request("/quiz/category-performance/", {
      method: "GET",
    });
  }


  async getUserStreak(): Promise<ApiResponse<any>> {
    return this.request("/streak/", {
      method: "GET",
    });
  }

  async getUserXP(): Promise<ApiResponse<any>> {
    return this.request("/xp/", {
      method: "GET",
    });
  }

  // New CSV-based quiz APIs
  async getQuizzesByCategory(
    category: string,
    subtopic: string
  ): Promise<any> {
    const params = new URLSearchParams({ category, subtopic });
    const response = await fetch(
      `${API_BASE_URL}/api/quiz/by-category/?${params}`
    );
    if (!response.ok) throw new Error("Failed to fetch quizzes by category");
    return response.json();
  }

  async countQuizzesByCategory(
    category: string,
    subtopic: string
  ): Promise<any> {
    const params = new URLSearchParams({ category, subtopic });
    const response = await fetch(
      `${API_BASE_URL}/api/quiz/count-by-category/?${params}`
    );
    if (!response.ok)
      throw new Error("Failed to count quizzes by category");
    return response.json();
  }

  async getQuizDetail(quizId: string): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/api/quiz/detail/${quizId}/`
    );
    if (!response.ok) throw new Error("Failed to fetch quiz details");
    return response.json();
  }

  async getQuizQuestionsFromCSV(quizId: string): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/quiz/csv/${quizId}/questions/`
    );
    if (!response.ok)
      throw new Error("Failed to fetch quiz questions from CSV");
    return response.json();
  }

  // Get quizzes created by the authenticated user
  async getMyCreatedQuizzes() {
    return this.request('/quiz/my-quizzes/', {
      method: 'GET',
    });
  }

  // Get global leaderboard with overall top 100 and weekly top 10
  async getGlobalLeaderboard(): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/leaderboard/global/`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch global leaderboard');
    return response.json();
  }

  // Old leaderboard method - deprecated, use getGlobalLeaderboard instead
  async getLeaderboard(limit: number = 10): Promise<ApiResponse<any>> {
    return this.getGlobalLeaderboard();
  }

  // Get user achievements
  async getUserAchievements(): Promise<ApiResponse<any>> {
    return this.request('/achievements/', {
      method: 'GET',
    });
  }

  // Get comprehensive user stats (all stats in one call)
  async getComprehensiveStats(): Promise<ApiResponse<any>> {
    return this.request('/stats/comprehensive/', {
      method: 'GET',
    });
  }

  // --- Fun & Activities APIs ---

  async getActivitySchedule(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/activities/schedule/`);
    if (!response.ok) throw new Error("Failed to fetch activity schedule");
    return response.json();
  }

  async getDailyProgress(dateStr?: string): Promise<any> {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = dateStr
      ? `${API_BASE_URL}/api/quiz/activities/daily-progress/?date=${dateStr}`
      : `${API_BASE_URL}/api/quiz/activities/daily-progress/`;

    const response = await fetch(url, {
      headers,
      credentials: "include"
    });
    if (!response.ok) throw new Error("Failed to fetch daily progress");
    return response.json();
  }

  async playActivity(activityId: number): Promise<any> {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/quiz/activities/${activityId}/play/`, {
      method: "GET",
      headers,
      credentials: "include"
    });

    if (!response.ok) throw new Error("Failed to load activity");
    return response.json();
  }

  async submitActivityScore(activityId: number, score: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/activities/${activityId}/submit/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      credentials: "include",
      body: JSON.stringify({ score })
    });
    if (!response.ok) throw new Error("Failed to submit score");
    return response.json();
  }

  async getActivityLeaderboard(activityId: number): Promise<{ total_participants: number, leaderboard: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/activities/${activityId}/leaderboard/`, {
      credentials: "include"
    });
    if (!response.ok) throw new Error("Failed to fetch leaderboard");
    return response.json();
  }

  // --- Live Quiz APIs ---

  async createLiveSession(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/live/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      credentials: "include"
    });
    if (!response.ok) throw new Error("Failed to create session");
    return response.json();
  }

  async joinLiveSession(code: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/live/join/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      credentials: "include",
      body: JSON.stringify({ code })
    });
    // Handle specific error messages
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to join session");
    }
    return response.json();
  }

  async getLiveSessionState(code: string, role: 'host' | 'player'): Promise<any> {
    const endpoint = role === 'host' ? 'host_state' : 'player_state';
    const response = await fetch(`${API_BASE_URL}/api/quiz/live/session/${code}/${endpoint}/`, {
      credentials: "include"
    });
    if (!response.ok) throw new Error("Failed to fetch session state");
    return response.json();
  }

  async updateLiveSession(code: string, action: string, data?: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/live/session/${code}/update_state/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      credentials: "include",
      body: JSON.stringify({ action, ...data })
    });
    if (!response.ok) throw new Error("Failed to update session");
    return response.json();
  }

  async updateLivePlayerScore(code: string, scoreDelta: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/live/session/${code}/player_update/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      credentials: "include",
      body: JSON.stringify({ score_delta: scoreDelta })
    });
    if (!response.ok) throw new Error("Failed to update score");
    return response.json();
  }

  async getLiveHistory(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/live/history/`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      credentials: "include"
    });
    if (!response.ok) throw new Error("Failed to fetch live history");
    return response.json();
  }

  async getLiveSessionResult(sessionId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/quiz/live/session/${sessionId}/result/`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      credentials: "include"
    });
    if (!response.ok) throw new Error("Failed to fetch session result");
    return response.json();
  }

  // --- Password Reset APIs ---

  async requestPasswordReset(email: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/request/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error('Failed to request password reset');
    return response.json();
  }

  async confirmPasswordReset(email: string, otp: string, newPassword: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, new_password: newPassword }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.error || 'Failed to reset password');
    }
    return response.json();
  }
}

export const api = new ApiService();

