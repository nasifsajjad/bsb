export type Role = 'super_admin' | 'committee' | 'area_leader'

export interface Branch {
  id: string
  name: string
  leader_id: string | null
  contact: string | null
  created_at: string
  leader?: Profile
}

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: Role
  branch_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  branch?: Branch
}

export interface Goal {
  id: string
  title: string
  description: string | null
  category: 'active' | 'completed' | 'upcoming'
  branch_id: string | null
  target_metric: string | null
  progress: number
  deadline: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  branch?: Branch
  creator?: Profile
}

export interface Event {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  location: string | null
  branch_id: string | null
  created_by: string | null
  created_at: string
  branch?: Branch
}

export interface Report {
  id: string
  branch_id: string
  period_type: 'weekly' | 'monthly'
  period_start: string
  period_end: string
  attendance: number
  sessions: number
  charity_bhd: number
  subjects: string | null
  notes: string | null
  submitted_by: string | null
  created_at: string
  updated_at: string
  branch?: Branch
  submitter?: Profile
}

export interface AppSettings {
  id: number
  app_name: string
  logo_url: string | null
  primary_color: string
  accent_color: string
  tagline: string | null
  contact_email: string | null
  updated_at: string
}

export interface DashboardStats {
  totalAttendance: number
  totalCharity: number
  activeGoals: number
  totalSessions: number
  branchCount: number
}
