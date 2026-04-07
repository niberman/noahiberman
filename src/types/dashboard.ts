// Dashboard Types
// Centralized type definitions for the dashboard system

import type { Json } from '@/lib/supabase';

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  type: 'Content' | 'Engagement' | 'Automation' | 'Analytics' | 'Other';
  status: 'active' | 'idle' | 'processing' | 'error' | 'disabled';
  config?: Json;
  last_run_at?: string;
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
  metadata?: Json;
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
    [key: string]: Json | undefined;
  };
  created_at: string;
  updated_at: string;
}

// API Request/Response Types

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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Database insert types (without generated fields)

export type AgentInsert = Omit<Agent, 'id' | 'created_at' | 'updated_at'>;
export type AircraftStatusInsert = Omit<AircraftStatus, 'id' | 'created_at' | 'last_updated'>;
export type FlightTrackingInsert = Omit<FlightTracking, 'id' | 'created_at' | 'updated_at'>;

