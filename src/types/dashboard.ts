// Dashboard Types
// Centralized type definitions for the dashboard system

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  type: 'Content' | 'Engagement' | 'Automation' | 'Analytics' | 'Other';
  status: 'active' | 'idle' | 'processing' | 'error' | 'disabled';
  config?: Record<string, any>;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  user_id: string;
  type: 'image' | 'text' | 'video' | 'document' | 'other';
  image_url?: string;
  text?: string;
  metadata?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface GeneratedPost {
  id: string;
  user_id: string;
  upload_id?: string;
  content: string;
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'other';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  metadata?: Record<string, any>;
  scheduled_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMContact {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  notes?: string;
  tags?: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'inactive' | 'archived';
  last_contacted_at?: string;
  follow_up_date?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AircraftStatus {
  id: string;
  user_id: string;
  aircraft_tail_number: string;
  aircraft_type: string;
  airport_base?: string;
  status: 'On Ground' | 'En Route' | 'Training' | 'Maintenance';
  location?: string;
  metadata?: Record<string, any>;
  last_updated: string;
  created_at: string;
}

export interface FlightTracking {
  id: string;
  user_id: string;
  fa_flight_id: string;
  flight_number?: string;
  origin: string;
  destination: string;
  departure_time?: string;
  arrival_time?: string;
  aircraft?: string;
  status: 'On Time' | 'Delayed' | 'Departed' | 'Arrived' | 'Cancelled';
  tracking_data?: {
    altitude?: number;
    speed?: number;
    heading?: number;
    latitude?: number;
    longitude?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

// API Request/Response Types

export interface GeneratePostRequest {
  textInput?: string;
  imageUrl?: string;
  platform?: GeneratedPost['platform'];
}

export interface GeneratePostResponse {
  success: boolean;
  post: string;
  postId: string;
}

export interface TrackFlightRequest {
  flightIdentifier: string;
}

export interface TrackFlightResponse {
  success: boolean;
  flight: {
    fa_flight_id: string;
    flight_number: string;
    origin: string;
    origin_name: string;
    destination: string;
    destination_name: string;
    departure_time: string;
    arrival_time: string;
    aircraft: string;
    status: FlightTracking['status'];
    tracking_data: FlightTracking['tracking_data'];
  };
  flightId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Database insert types (without generated fields)

export type AgentInsert = Omit<Agent, 'id' | 'created_at' | 'updated_at'>;
export type UploadInsert = Omit<Upload, 'id' | 'created_at' | 'updated_at'>;
export type GeneratedPostInsert = Omit<GeneratedPost, 'id' | 'created_at' | 'updated_at'>;
export type CRMContactInsert = Omit<CRMContact, 'id' | 'created_at' | 'updated_at'>;
export type AircraftStatusInsert = Omit<AircraftStatus, 'id' | 'created_at' | 'last_updated'>;
export type FlightTrackingInsert = Omit<FlightTracking, 'id' | 'created_at' | 'updated_at'>;

