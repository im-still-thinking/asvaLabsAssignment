// User type
export interface User {
  id: string;
  username: string;
  followers: number;
  isLoggedIn: boolean;
}

// Vote type
export interface Vote {
  userId: string;
  vote: 'yes' | 'no';
  influence: number;
}

// Topic type
export interface Topic {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  endTime: Date;
  votes: Vote[];
  status: 'active' | 'processing' | 'approved' | 'rejected' | 'error' | 'completed';
  changeType: 'color' | 'font';
  changeValue: string;
  createdBy: string;
}

// App settings type
export interface AppSettings {
  primaryColor: string;
  fontFamily: string;
} 