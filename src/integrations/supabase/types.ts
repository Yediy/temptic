export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      adverse_actions: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          final_adverse_sent_at: string | null
          id: string
          order_id: string | null
          pre_adverse_sent_at: string | null
          reason: string | null
          stage: Database["public"]["Enums"]["adverse_action_stage"]
          worker_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          final_adverse_sent_at?: string | null
          id?: string
          order_id?: string | null
          pre_adverse_sent_at?: string | null
          reason?: string | null
          stage: Database["public"]["Enums"]["adverse_action_stage"]
          worker_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          final_adverse_sent_at?: string | null
          id?: string
          order_id?: string | null
          pre_adverse_sent_at?: string | null
          reason?: string | null
          stage?: Database["public"]["Enums"]["adverse_action_stage"]
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adverse_actions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adverse_actions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "screening_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adverse_actions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "adverse_actions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "adverse_actions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          branch_name: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_demo: boolean
          logo_url: string | null
          name: string
          phone: string | null
          state: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at: string | null
          subscription_current_period_end: string | null
          subscription_plan: string | null
          subscription_status: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          branch_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at?: string | null
          subscription_current_period_end?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          branch_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at?: string | null
          subscription_current_period_end?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_settings: {
        Row: {
          agency_id: string
          created_at: string
          default_start_time: string | null
          default_template_id: string | null
          default_ticket_type: Database["public"]["Enums"]["ticket_type"]
          id: string
          reminder_hours: number
          signature_request_email_text: string | null
          updated_at: string
          worker_sees_client_name: boolean
          worker_sees_site_name: boolean
        }
        Insert: {
          agency_id: string
          created_at?: string
          default_start_time?: string | null
          default_template_id?: string | null
          default_ticket_type?: Database["public"]["Enums"]["ticket_type"]
          id?: string
          reminder_hours?: number
          signature_request_email_text?: string | null
          updated_at?: string
          worker_sees_client_name?: boolean
          worker_sees_site_name?: boolean
        }
        Update: {
          agency_id?: string
          created_at?: string
          default_start_time?: string | null
          default_template_id?: string | null
          default_ticket_type?: Database["public"]["Enums"]["ticket_type"]
          id?: string
          reminder_hours?: number
          signature_request_email_text?: string | null
          updated_at?: string
          worker_sees_client_name?: boolean
          worker_sees_site_name?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agency_settings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_settings_default_template_id_fkey"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "ticket_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          actor_id: string | null
          agency_id: string
          created_at: string
          error: string | null
          id: string
          input_ref: string | null
          input_summary: string | null
          kind: string
          model: string | null
          output_summary: string | null
          status: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          actor_id?: string | null
          agency_id: string
          created_at?: string
          error?: string | null
          id?: string
          input_ref?: string | null
          input_summary?: string | null
          kind: string
          model?: string | null
          output_summary?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          actor_id?: string | null
          agency_id?: string
          created_at?: string
          error?: string | null
          id?: string
          input_ref?: string | null
          input_summary?: string | null
          kind?: string
          model?: string | null
          output_summary?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          job_order_id: string
          source: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          worker_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          job_order_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          worker_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          job_order_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "applications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "applications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          agency_id: string
          client_id: string | null
          created_at: string
          ends_on: string | null
          id: string
          placement_id: string | null
          site_id: string | null
          starts_on: string
          status: string
          ticket_id: string | null
          worker_id: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          created_at?: string
          ends_on?: string | null
          id?: string
          placement_id?: string | null
          site_id?: string | null
          starts_on: string
          status?: string
          ticket_id?: string | null
          worker_id: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          created_at?: string
          ends_on?: string | null
          id?: string
          placement_id?: string | null
          site_id?: string | null
          starts_on?: string
          status?: string
          ticket_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          ticket_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          ticket_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_events: {
        Row: {
          actor_id: string | null
          agency_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
        }
        Insert: {
          actor_id?: string | null
          agency_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Update: {
          actor_id?: string | null
          agency_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_profiles: {
        Row: {
          active: boolean
          agency_id: string
          client_id: string | null
          created_at: string
          dt_bill_multiplier: number
          flat_bill_rate: number | null
          id: string
          markup_percent: number
          name: string
          ot_bill_multiplier: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          agency_id: string
          client_id?: string | null
          created_at?: string
          dt_bill_multiplier?: number
          flat_bill_rate?: number | null
          id?: string
          markup_percent?: number
          name: string
          ot_bill_multiplier?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          agency_id?: string
          client_id?: string | null
          created_at?: string
          dt_bill_multiplier?: number
          flat_bill_rate?: number | null
          id?: string
          markup_percent?: number
          name?: string
          ot_bill_multiplier?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_decisions: {
        Row: {
          ai_followed: boolean
          ai_rationale: string | null
          ai_viewed: boolean
          application_id: string
          decided_at: string
          decided_by: string | null
          decision: Database["public"]["Enums"]["decision_type"]
          id: string
          notes: string | null
          reason_code: string | null
        }
        Insert: {
          ai_followed?: boolean
          ai_rationale?: string | null
          ai_viewed?: boolean
          application_id: string
          decided_at?: string
          decided_by?: string | null
          decision: Database["public"]["Enums"]["decision_type"]
          id?: string
          notes?: string | null
          reason_code?: string | null
        }
        Update: {
          ai_followed?: boolean
          ai_rationale?: string | null
          ai_viewed?: boolean
          application_id?: string
          decided_at?: string
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["decision_type"]
          id?: string
          notes?: string | null
          reason_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_decisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_submissions: {
        Row: {
          application_id: string
          id: string
          notes: string | null
          submitted_at: string
          submitted_bill_rate: number | null
          submitted_by: string | null
          submitted_pay_rate: number | null
        }
        Insert: {
          application_id: string
          id?: string
          notes?: string | null
          submitted_at?: string
          submitted_bill_rate?: number | null
          submitted_by?: string | null
          submitted_pay_rate?: number | null
        }
        Update: {
          application_id?: string
          id?: string
          notes?: string | null
          submitted_at?: string
          submitted_bill_rate?: number | null
          submitted_by?: string | null
          submitted_pay_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_submissions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invites: {
        Row: {
          accepted_at: string | null
          agency_id: string
          client_id: string
          client_signer_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          status: string
          token_hash: string | null
        }
        Insert: {
          accepted_at?: string | null
          agency_id: string
          client_id: string
          client_signer_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          status?: string
          token_hash?: string | null
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string
          client_id?: string
          client_signer_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          status?: string
          token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invites_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invites_client_signer_id_fkey"
            columns: ["client_signer_id"]
            isOneToOne: false
            referencedRelation: "client_signers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_signers: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          initials: string | null
          is_active: boolean
          last_name: string
          phone: string | null
          site_id: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          initials?: string | null
          is_active?: boolean
          last_name: string
          phone?: string | null
          site_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          initials?: string | null
          is_active?: boolean
          last_name?: string
          phone?: string | null
          site_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_signers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_signers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sites: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string | null
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          report_to_name: string | null
          report_to_phone: string | null
          site_code: string | null
          site_name: string | null
          state: string | null
          zip: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          report_to_name?: string | null
          report_to_phone?: string | null
          site_code?: string | null
          site_name?: string | null
          state?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          report_to_name?: string | null
          report_to_phone?: string | null
          site_code?: string | null
          site_name?: string | null
          state?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          agency_id: string
          billing_email: string | null
          billing_name: string | null
          billing_phone: string | null
          company_name: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
        }
        Insert: {
          agency_id: string
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          company_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
        }
        Update: {
          agency_id?: string
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          company_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          agency_id: string | null
          category: string | null
          created_at: string
          id: string
          is_global: boolean
          name: string
          requires_expiration: boolean
        }
        Insert: {
          agency_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          name: string
          requires_expiration?: boolean
        }
        Update: {
          agency_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          name?: string
          requires_expiration?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "credentials_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          agency_id: string
          content_sha256: string
          id: string
          ip_address: string | null
          pdf_storage_path: string | null
          signature_image_url: string | null
          signed_at: string
          template_id: string
          typed_name: string
          user_agent: string | null
          version_id: string | null
          worker_id: string
        }
        Insert: {
          agency_id: string
          content_sha256: string
          id?: string
          ip_address?: string | null
          pdf_storage_path?: string | null
          signature_image_url?: string | null
          signed_at?: string
          template_id: string
          typed_name: string
          user_agent?: string | null
          version_id?: string | null
          worker_id: string
        }
        Update: {
          agency_id?: string
          content_sha256?: string
          id?: string
          ip_address?: string | null
          pdf_storage_path?: string | null
          signature_image_url?: string | null
          signed_at?: string
          template_id?: string
          typed_name?: string
          user_agent?: string | null
          version_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "document_signatures_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "document_signatures_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          agency_id: string
          body_markdown: string
          classification: string
          created_at: string
          description: string | null
          id: string
          name: string
          requires_signature: boolean
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
        }
        Insert: {
          agency_id: string
          body_markdown?: string
          classification?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          requires_signature?: boolean
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string
          body_markdown?: string
          classification?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          requires_signature?: boolean
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          body_markdown: string
          created_at: string
          effective_from: string
          id: string
          template_id: string
          version_number: number
        }
        Insert: {
          body_markdown?: string
          created_at?: string
          effective_from?: string
          id?: string
          template_id: string
          version_number?: number
        }
        Update: {
          body_markdown?: string
          created_at?: string
          effective_from?: string
          id?: string
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      download_logs: {
        Row: {
          downloaded_at: string
          downloaded_by_id: string | null
          downloaded_by_role: string
          id: string
          ip_address: string | null
          pdf_document_id: string | null
          ticket_id: string
          user_agent: string | null
        }
        Insert: {
          downloaded_at?: string
          downloaded_by_id?: string | null
          downloaded_by_role: string
          id?: string
          ip_address?: string | null
          pdf_document_id?: string | null
          ticket_id: string
          user_agent?: string | null
        }
        Update: {
          downloaded_at?: string
          downloaded_by_id?: string | null
          downloaded_by_role?: string
          id?: string
          ip_address?: string | null
          pdf_document_id?: string | null
          ticket_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "download_logs_pdf_document_id_fkey"
            columns: ["pdf_document_id"]
            isOneToOne: false
            referencedRelation: "pdf_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      eeo_demographics: {
        Row: {
          created_at: string
          date_of_birth: string | null
          disability_status: string | null
          ethnicity: string | null
          gender: string | null
          race: string | null
          submitted_at: string | null
          updated_at: string
          veteran_status: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          disability_status?: string | null
          ethnicity?: string | null
          gender?: string | null
          race?: string | null
          submitted_at?: string | null
          updated_at?: string
          veteran_status?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          disability_status?: string | null
          ethnicity?: string | null
          gender?: string | null
          race?: string | null
          submitted_at?: string | null
          updated_at?: string
          veteran_status?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eeo_demographics_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "eeo_demographics_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "eeo_demographics_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          relationship: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          relationship?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          relationship?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "emergency_contacts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "emergency_contacts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_history: {
        Row: {
          created_at: string
          description: string | null
          employer: string
          ended_on: string | null
          id: string
          is_current: boolean
          location: string | null
          role: string | null
          started_on: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          employer: string
          ended_on?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          role?: string | null
          started_on?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          employer?: string
          ended_on?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          role?: string | null
          started_on?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_history_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "employment_history_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "employment_history_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          location: string | null
          mode: string | null
          notes: string | null
          outcome: string | null
          scheduled_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          location?: string | null
          mode?: string | null
          notes?: string | null
          outcome?: string | null
          scheduled_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          location?: string | null
          mode?: string | null
          notes?: string | null
          outcome?: string | null
          scheduled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_orders: {
        Row: {
          agency_id: string
          bill_rate: number | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_on: string | null
          id: string
          industry: string | null
          location: string | null
          pay_rate: number | null
          positions_filled: number
          positions_needed: number
          site_id: string | null
          starts_on: string | null
          status: Database["public"]["Enums"]["job_order_status"]
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          bill_rate?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_on?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          pay_rate?: number | null
          positions_filled?: number
          positions_needed?: number
          site_id?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["job_order_status"]
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          bill_rate?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_on?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          pay_rate?: number | null
          positions_filled?: number
          positions_needed?: number
          site_id?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["job_order_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requirements: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          job_order_id: string
          kind: string
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          job_order_id: string
          kind: string
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          job_order_id?: string
          kind?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requirements_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      network_partnerships: {
        Row: {
          activated_at: string | null
          id: string
          notes: string | null
          partner_agency_id: string
          requested_at: string
          requesting_agency_id: string
          shared_job_orders: boolean
          shared_talent: boolean
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          id?: string
          notes?: string | null
          partner_agency_id: string
          requested_at?: string
          requesting_agency_id: string
          shared_job_orders?: boolean
          shared_talent?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          id?: string
          notes?: string | null
          partner_agency_id?: string
          requested_at?: string
          requesting_agency_id?: string
          shared_job_orders?: boolean
          shared_talent?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_partnerships_partner_agency_id_fkey"
            columns: ["partner_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_partnerships_requesting_agency_id_fkey"
            columns: ["requesting_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          agency_id: string
          created_at: string
          error_message: string | null
          id: string
          recipient_email: string | null
          recipient_id: string | null
          recipient_type: string
          sent_at: string | null
          status: string
          subject: string | null
          template_key: string
          ticket_id: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_type: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key: string
          ticket_id?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_type?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_key?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          application_id: string
          bill_rate: number | null
          id: string
          notes: string | null
          offered_at: string
          pay_rate: number | null
          responded_at: string | null
          start_date: string | null
          status: string
        }
        Insert: {
          application_id: string
          bill_rate?: number | null
          id?: string
          notes?: string | null
          offered_at?: string
          pay_rate?: number | null
          responded_at?: string | null
          start_date?: string | null
          status?: string
        }
        Update: {
          application_id?: string
          bill_rate?: number | null
          id?: string
          notes?: string | null
          offered_at?: string
          pay_rate?: number | null
          responded_at?: string | null
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklists: {
        Row: {
          agency_id: string
          cleared_at: string | null
          created_at: string
          id: string
          notes: string | null
          stage: Database["public"]["Enums"]["onboarding_stage"]
          template_id: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          agency_id: string
          cleared_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["onboarding_stage"]
          template_id?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          agency_id?: string
          cleared_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["onboarding_stage"]
          template_id?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklists_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "onboarding_checklists_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "onboarding_checklists_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_items: {
        Row: {
          category: string
          checklist_id: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          label: string
          required: boolean
          requirement_id: string | null
          sort_order: number
        }
        Insert: {
          category?: string
          checklist_id: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          label: string
          required?: boolean
          requirement_id?: string | null
          sort_order?: number
        }
        Update: {
          category?: string
          checklist_id?: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          label?: string
          required?: boolean
          requirement_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_items_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "onboarding_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_requirements: {
        Row: {
          category: string
          created_at: string
          description: string | null
          document_template_id: string | null
          id: string
          label: string
          required: boolean
          sort_order: number
          template_id: string
          training_course_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          document_template_id?: string | null
          id?: string
          label: string
          required?: boolean
          sort_order?: number
          template_id: string
          training_course_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          document_template_id?: string | null
          id?: string
          label?: string
          required?: boolean
          sort_order?: number
          template_id?: string
          training_course_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_requirements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          agency_id: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          scope: Database["public"]["Enums"]["onboarding_scope"]
          scope_ref_id: string | null
          stage_labels: Json
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          scope?: Database["public"]["Enums"]["onboarding_scope"]
          scope_ref_id?: string | null
          stage_labels?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          scope?: Database["public"]["Enums"]["onboarding_scope"]
          scope_ref_id?: string | null
          stage_labels?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          agency_id: string
          city: string | null
          country: string | null
          created_at: string
          id: string
          is_primary: boolean
          name: string
          postal_code: string | null
          state: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          agency_id: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          name: string
          postal_code?: string | null
          state?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          agency_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          name?: string
          postal_code?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_locations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_profiles: {
        Row: {
          active: boolean
          agency_id: string
          base_rate: number | null
          burden_percent: number
          created_at: string
          daily_ot_threshold: number | null
          differential_rules: Json
          dt_multiplier: number
          id: string
          name: string
          ot_multiplier: number
          updated_at: string
          weekly_ot_threshold: number
        }
        Insert: {
          active?: boolean
          agency_id: string
          base_rate?: number | null
          burden_percent?: number
          created_at?: string
          daily_ot_threshold?: number | null
          differential_rules?: Json
          dt_multiplier?: number
          id?: string
          name: string
          ot_multiplier?: number
          updated_at?: string
          weekly_ot_threshold?: number
        }
        Update: {
          active?: boolean
          agency_id?: string
          base_rate?: number | null
          burden_percent?: number
          created_at?: string
          daily_ot_threshold?: number | null
          differential_rules?: Json
          dt_multiplier?: number
          id?: string
          name?: string
          ot_multiplier?: number
          updated_at?: string
          weekly_ot_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "pay_profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_documents: {
        Row: {
          file_name: string
          generated_at: string
          generated_by: string | null
          id: string
          pdf_type: Database["public"]["Enums"]["pdf_type"]
          storage_url: string
          ticket_id: string
          version_number: number
        }
        Insert: {
          file_name: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          pdf_type: Database["public"]["Enums"]["pdf_type"]
          storage_url: string
          ticket_id: string
          version_number?: number
        }
        Update: {
          file_name?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          pdf_type?: Database["public"]["Enums"]["pdf_type"]
          storage_url?: string
          ticket_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdf_documents_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      placements: {
        Row: {
          agency_id: string
          application_id: string
          bill_rate: number | null
          created_at: string
          ends_on: string | null
          id: string
          job_order_id: string
          pay_rate: number | null
          starts_on: string
          status: string
          worker_id: string
        }
        Insert: {
          agency_id: string
          application_id: string
          bill_rate?: number | null
          created_at?: string
          ends_on?: string | null
          id?: string
          job_order_id: string
          pay_rate?: number | null
          starts_on: string
          status?: string
          worker_id: string
        }
        Update: {
          agency_id?: string
          application_id?: string
          bill_rate?: number | null
          created_at?: string
          ends_on?: string | null
          id?: string
          job_order_id?: string
          pay_rate?: number | null
          starts_on?: string
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "placements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "placements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id: string
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          attempt_count: number | null
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          rate_key: string
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          rate_key: string
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          rate_key?: string
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string
          key: string
          reset_at: string
        }
        Insert: {
          count?: number
          created_at?: string
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          created_at?: string
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      recruit_candidate_scores: {
        Row: {
          agency_id: string
          created_at: string
          factors: Json
          id: string
          last_computed_at: string
          performance_score: number | null
          reliability_score: number | null
          reputation_score: number | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          factors?: Json
          id?: string
          last_computed_at?: string
          performance_score?: number | null
          reliability_score?: number | null
          reputation_score?: number | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          factors?: Json
          id?: string
          last_computed_at?: string
          performance_score?: number | null
          reliability_score?: number | null
          reputation_score?: number | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      recruit_client_contacts: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          preferences: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          preferences?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          preferences?: Json
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recruit_marketplace_interest: {
        Row: {
          created_at: string
          id: string
          note: string | null
          opportunity_id: string
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          opportunity_id: string
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          opportunity_id?: string
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruit_marketplace_interest_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "recruit_marketplace_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      recruit_marketplace_opportunities: {
        Row: {
          agency_id: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          job_order_id: string | null
          kind: string
          payload: Json
          published_at: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          job_order_id?: string | null
          kind: string
          payload?: Json
          published_at?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          job_order_id?: string | null
          kind?: string
          payload?: Json
          published_at?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      recruit_pipeline_entries: {
        Row: {
          agency_id: string
          assignment_id: string | null
          created_at: string
          entered_at: string
          id: string
          job_order_id: string | null
          notes: string | null
          pipeline_id: string
          stage_id: string
          submission_id: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          agency_id: string
          assignment_id?: string | null
          created_at?: string
          entered_at?: string
          id?: string
          job_order_id?: string | null
          notes?: string | null
          pipeline_id: string
          stage_id: string
          submission_id?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          agency_id?: string
          assignment_id?: string | null
          created_at?: string
          entered_at?: string
          id?: string
          job_order_id?: string | null
          notes?: string | null
          pipeline_id?: string
          stage_id?: string
          submission_id?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruit_pipeline_entries_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "recruit_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruit_pipeline_entries_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "recruit_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      recruit_pipeline_stages: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          pipeline_id: string
          position: number
          stage_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          pipeline_id: string
          position?: number
          stage_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          pipeline_id?: string
          position?: number
          stage_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruit_pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "recruit_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      recruit_pipelines: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          is_default: boolean
          job_order_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          job_order_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          job_order_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      recruit_recruiter_activity: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          metadata: Json
          recruiter_id: string
          subject_entity: string
          subject_id: string
          verb: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          metadata?: Json
          recruiter_id: string
          subject_entity: string
          subject_id: string
          verb: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          recruiter_id?: string
          subject_entity?: string
          subject_id?: string
          verb?: string
        }
        Relationships: []
      }
      recruit_talent_preferences: {
        Row: {
          agency_id: string
          availability: Json
          created_at: string
          id: string
          marketplace_opt_in: boolean
          max_travel_miles: number | null
          min_pay_rate: number | null
          preferred_locations: string[]
          preferred_roles: string[]
          remote_ok: boolean
          updated_at: string
          worker_id: string
        }
        Insert: {
          agency_id: string
          availability?: Json
          created_at?: string
          id?: string
          marketplace_opt_in?: boolean
          max_travel_miles?: number | null
          min_pay_rate?: number | null
          preferred_locations?: string[]
          preferred_roles?: string[]
          remote_ok?: boolean
          updated_at?: string
          worker_id: string
        }
        Update: {
          agency_id?: string
          availability?: Json
          created_at?: string
          id?: string
          marketplace_opt_in?: boolean
          max_travel_miles?: number | null
          min_pay_rate?: number | null
          preferred_locations?: string[]
          preferred_roles?: string[]
          remote_ok?: boolean
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      resume_parse_runs: {
        Row: {
          applied_fields: Json
          created_at: string
          created_by: string | null
          document_id: string | null
          error: string | null
          id: string
          provider: string
          status: string
          suggestions: Json
          updated_at: string
          worker_id: string
        }
        Insert: {
          applied_fields?: Json
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          error?: string | null
          id?: string
          provider?: string
          status?: string
          suggestions?: Json
          updated_at?: string
          worker_id: string
        }
        Update: {
          applied_fields?: Json
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          error?: string | null
          id?: string
          provider?: string
          status?: string
          suggestions?: Json
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_parse_runs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "worker_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_parse_runs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "resume_parse_runs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "resume_parse_runs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          actions: string[]
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          actions?: string[]
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          actions?: string[]
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      saved_reports: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          id: string
          is_shared: boolean
          last_run_at: string | null
          module: string
          name: string
          query_spec: Json
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          last_run_at?: string | null
          module: string
          name: string
          query_spec?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          last_run_at?: string | null
          module?: string
          name?: string
          query_spec?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_consents: {
        Row: {
          consent_type: string
          created_at: string
          document_url: string | null
          id: string
          ip_address: unknown
          order_id: string | null
          signed_at: string | null
          user_agent: string | null
          worker_id: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          document_url?: string | null
          id?: string
          ip_address?: unknown
          order_id?: string | null
          signed_at?: string | null
          user_agent?: string | null
          worker_id: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          document_url?: string | null
          id?: string
          ip_address?: unknown
          order_id?: string | null
          signed_at?: string | null
          user_agent?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_consents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "screening_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_consents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "screening_consents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "screening_consents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_orders: {
        Row: {
          agency_id: string
          application_id: string | null
          completed_at: string | null
          external_id: string | null
          id: string
          metadata: Json
          ordered_at: string
          ordered_by: string | null
          package_id: string | null
          provider: string
          provider_id: string | null
          status: Database["public"]["Enums"]["screening_status"]
          worker_id: string
        }
        Insert: {
          agency_id: string
          application_id?: string | null
          completed_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json
          ordered_at?: string
          ordered_by?: string | null
          package_id?: string | null
          provider?: string
          provider_id?: string | null
          status?: Database["public"]["Enums"]["screening_status"]
          worker_id: string
        }
        Update: {
          agency_id?: string
          application_id?: string | null
          completed_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json
          ordered_at?: string
          ordered_by?: string | null
          package_id?: string | null
          provider?: string
          provider_id?: string | null
          status?: Database["public"]["Enums"]["screening_status"]
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_orders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_orders_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "screening_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "screening_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_orders_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "screening_orders_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "screening_orders_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_packages: {
        Row: {
          created_at: string
          external_key: string | null
          id: string
          includes: string[] | null
          name: string
          price_cents: number | null
          provider_id: string
        }
        Insert: {
          created_at?: string
          external_key?: string | null
          id?: string
          includes?: string[] | null
          name: string
          price_cents?: number | null
          provider_id: string
        }
        Update: {
          created_at?: string
          external_key?: string | null
          id?: string
          includes?: string[] | null
          name?: string
          price_cents?: number | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_packages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "screening_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_providers: {
        Row: {
          adapter_key: string
          agency_id: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          adapter_key?: string
          agency_id: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          adapter_key?: string
          agency_id?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_providers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_reports: {
        Row: {
          document_url: string | null
          id: string
          order_id: string
          received_at: string
          result: string | null
          summary: Json
        }
        Insert: {
          document_url?: string | null
          id?: string
          order_id: string
          received_at?: string
          result?: string | null
          summary?: Json
        }
        Update: {
          document_url?: string | null
          id?: string
          order_id?: string
          received_at?: string
          result?: string | null
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "screening_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "screening_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_webhook_events: {
        Row: {
          event_type: string | null
          external_id: string | null
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          signature_valid: boolean | null
        }
        Insert: {
          event_type?: string | null
          external_id?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          received_at?: string
          signature_valid?: boolean | null
        }
        Update: {
          event_type?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          signature_valid?: boolean | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          agency_id: string
          assignment_id: string | null
          client_id: string | null
          created_at: string
          end_time: string | null
          id: string
          shift_date: string
          site_id: string | null
          start_time: string | null
          status: string
          ticket_id: string | null
          worker_id: string | null
        }
        Insert: {
          agency_id: string
          assignment_id?: string | null
          client_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          shift_date: string
          site_id?: string | null
          start_time?: string | null
          status?: string
          ticket_id?: string | null
          worker_id?: string | null
        }
        Update: {
          agency_id?: string
          assignment_id?: string | null
          client_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          shift_date?: string
          site_id?: string | null
          start_time?: string | null
          status?: string
          ticket_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "shifts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "shifts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          agency_id: string | null
          category: string | null
          created_at: string
          id: string
          is_global: boolean
          name: string
        }
        Insert: {
          agency_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          name: string
        }
        Update: {
          agency_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          payload: Json
          processed_at: string | null
          received_at: string
          type: string
        }
        Insert: {
          id: string
          payload: Json
          processed_at?: string | null
          received_at?: string
          type: string
        }
        Update: {
          id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          type?: string
        }
        Relationships: []
      }
      template_field_mappings: {
        Row: {
          created_at: string
          field_key: string
          field_type: string
          font_family: string | null
          font_size: number | null
          height: number | null
          id: string
          is_required: boolean
          page_number: number
          template_id: string
          width: number | null
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          field_key: string
          field_type?: string
          font_family?: string | null
          font_size?: number | null
          height?: number | null
          id?: string
          is_required?: boolean
          page_number?: number
          template_id: string
          width?: number | null
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          field_key?: string
          field_type?: string
          font_family?: string | null
          font_size?: number | null
          height?: number | null
          id?: string
          is_required?: boolean
          page_number?: number
          template_id?: string
          width?: number | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_field_mappings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ticket_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_counters: {
        Row: {
          agency_id: string
          current_year: number
          last_number: number
        }
        Insert: {
          agency_id: string
          current_year?: number
          last_number?: number
        }
        Update: {
          agency_id?: string
          current_year?: number
          last_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_counters_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_days: {
        Row: {
          client_approved: boolean
          created_at: string
          day_date: string
          day_name: string | null
          end_time: string | null
          id: string
          lunch_end: string | null
          lunch_start: string | null
          overtime_hours: number
          regular_hours: number
          start_time: string | null
          ticket_id: string
          total_hours: number
        }
        Insert: {
          client_approved?: boolean
          created_at?: string
          day_date: string
          day_name?: string | null
          end_time?: string | null
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          overtime_hours?: number
          regular_hours?: number
          start_time?: string | null
          ticket_id: string
          total_hours?: number
        }
        Update: {
          client_approved?: boolean
          created_at?: string
          day_date?: string
          day_name?: string | null
          end_time?: string | null
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          overtime_hours?: number
          regular_hours?: number
          start_time?: string | null
          ticket_id?: string
          total_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_days_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_signatures: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          signature_image_url: string | null
          signed_at: string
          signer_email: string | null
          signer_initials: string | null
          signer_name: string
          signer_phone: string | null
          signer_title: string | null
          signer_type: Database["public"]["Enums"]["signer_type"]
          ticket_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_image_url?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_initials?: string | null
          signer_name: string
          signer_phone?: string | null
          signer_title?: string | null
          signer_type: Database["public"]["Enums"]["signer_type"]
          ticket_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_image_url?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_initials?: string | null
          signer_name?: string
          signer_phone?: string | null
          signer_title?: string | null
          signer_type?: Database["public"]["Enums"]["signer_type"]
          ticket_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_signatures_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_templates: {
        Row: {
          agency_id: string | null
          created_at: string
          css_markup: string | null
          html_markup: string | null
          id: string
          is_active: boolean
          is_default: boolean
          preview_image_url: string | null
          source_file_url: string | null
          template_name: string
          template_scope: Database["public"]["Enums"]["ticket_type"]
          template_type: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          css_markup?: string | null
          html_markup?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          preview_image_url?: string | null
          source_file_url?: string | null
          template_name: string
          template_scope?: Database["public"]["Enums"]["ticket_type"]
          template_type?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          css_markup?: string | null
          html_markup?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          preview_image_url?: string | null
          source_file_url?: string | null
          template_name?: string
          template_scope?: Database["public"]["Enums"]["ticket_type"]
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          agency_id: string
          boots_required: boolean
          client_company_name_snapshot: string
          client_id: string
          client_initials: string | null
          created_at: string
          created_by: string | null
          equipment_provided: boolean
          equipment_required: string | null
          future_order_date: string | null
          future_order_same_workers: boolean
          future_order_time: string | null
          future_order_worker_count: number | null
          glasses_required: boolean
          gloves_required: boolean
          hard_hat_required: boolean
          id: string
          job_title: string | null
          lunch_required: boolean
          notes: string | null
          order_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          report_to_name_snapshot: string | null
          report_to_phone_snapshot: string | null
          sent_at: string | null
          signed_at: string | null
          site_address_snapshot: string | null
          site_code_snapshot: string | null
          site_id: string | null
          site_name_snapshot: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          supervisor_name: string | null
          supervisor_title: string | null
          ticket_number: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          total_hours: number | null
          transportation_provided: boolean
          updated_at: string
          version_number: number
          vest_required: boolean
          viewed_at: string | null
          week_end_date: string | null
          week_start_date: string | null
          work_date: string | null
          worker_id: string
          worker_name_snapshot: string
        }
        Insert: {
          agency_id: string
          boots_required?: boolean
          client_company_name_snapshot: string
          client_id: string
          client_initials?: string | null
          created_at?: string
          created_by?: string | null
          equipment_provided?: boolean
          equipment_required?: string | null
          future_order_date?: string | null
          future_order_same_workers?: boolean
          future_order_time?: string | null
          future_order_worker_count?: number | null
          glasses_required?: boolean
          gloves_required?: boolean
          hard_hat_required?: boolean
          id?: string
          job_title?: string | null
          lunch_required?: boolean
          notes?: string | null
          order_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          report_to_name_snapshot?: string | null
          report_to_phone_snapshot?: string | null
          sent_at?: string | null
          signed_at?: string | null
          site_address_snapshot?: string | null
          site_code_snapshot?: string | null
          site_id?: string | null
          site_name_snapshot?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          supervisor_name?: string | null
          supervisor_title?: string | null
          ticket_number: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          total_hours?: number | null
          transportation_provided?: boolean
          updated_at?: string
          version_number?: number
          vest_required?: boolean
          viewed_at?: string | null
          week_end_date?: string | null
          week_start_date?: string | null
          work_date?: string | null
          worker_id: string
          worker_name_snapshot: string
        }
        Update: {
          agency_id?: string
          boots_required?: boolean
          client_company_name_snapshot?: string
          client_id?: string
          client_initials?: string | null
          created_at?: string
          created_by?: string | null
          equipment_provided?: boolean
          equipment_required?: string | null
          future_order_date?: string | null
          future_order_same_workers?: boolean
          future_order_time?: string | null
          future_order_worker_count?: number | null
          glasses_required?: boolean
          gloves_required?: boolean
          hard_hat_required?: boolean
          id?: string
          job_title?: string | null
          lunch_required?: boolean
          notes?: string | null
          order_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          report_to_name_snapshot?: string | null
          report_to_phone_snapshot?: string | null
          sent_at?: string | null
          signed_at?: string | null
          site_address_snapshot?: string | null
          site_code_snapshot?: string | null
          site_id?: string | null
          site_name_snapshot?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          supervisor_name?: string | null
          supervisor_title?: string | null
          ticket_number?: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          total_hours?: number | null
          transportation_provided?: boolean
          updated_at?: string
          version_number?: number
          vest_required?: boolean
          viewed_at?: string | null
          week_end_date?: string | null
          week_start_date?: string | null
          work_date?: string | null
          worker_id?: string
          worker_name_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "client_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "tickets_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "tickets_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      training_certificates: {
        Row: {
          agency_id: string
          certificate_number: string
          course_id: string
          enrollment_id: string
          expires_at: string | null
          id: string
          issued_at: string
          pdf_storage_path: string | null
          worker_id: string
        }
        Insert: {
          agency_id: string
          certificate_number: string
          course_id: string
          enrollment_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          pdf_storage_path?: string | null
          worker_id: string
        }
        Update: {
          agency_id?: string
          certificate_number?: string
          course_id?: string
          enrollment_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          pdf_storage_path?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_certificates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "training_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certificates_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "training_certificates_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "training_certificates_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          agency_id: string
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          required: boolean
          status: Database["public"]["Enums"]["document_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          required?: boolean
          status?: Database["public"]["Enums"]["document_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          required?: boolean
          status?: Database["public"]["Enums"]["document_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          agency_id: string
          completed_at: string | null
          course_id: string
          created_at: string
          expires_at: string | null
          id: string
          progress_pct: number
          started_at: string | null
          status: Database["public"]["Enums"]["training_enrollment_status"]
          updated_at: string
          worker_id: string
        }
        Insert: {
          agency_id: string
          completed_at?: string | null
          course_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          progress_pct?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_enrollment_status"]
          updated_at?: string
          worker_id: string
        }
        Update: {
          agency_id?: string
          completed_at?: string | null
          course_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          progress_pct?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_enrollment_status"]
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "training_enrollments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "training_enrollments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      training_lessons: {
        Row: {
          body: string | null
          course_id: string
          created_at: string
          duration_seconds: number
          id: string
          lesson_type: Database["public"]["Enums"]["training_lesson_type"]
          media_url: string | null
          quiz_json: Json | null
          sort_order: number
          title: string
        }
        Insert: {
          body?: string | null
          course_id: string
          created_at?: string
          duration_seconds?: number
          id?: string
          lesson_type?: Database["public"]["Enums"]["training_lesson_type"]
          media_url?: string | null
          quiz_json?: Json | null
          sort_order?: number
          title: string
        }
        Update: {
          body?: string | null
          course_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          lesson_type?: Database["public"]["Enums"]["training_lesson_type"]
          media_url?: string | null
          quiz_json?: Json | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          completed: boolean
          enrollment_id: string
          id: string
          last_position_seconds: number
          lesson_id: string
          updated_at: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          enrollment_id: string
          id?: string
          last_position_seconds?: number
          lesson_id: string
          updated_at?: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          enrollment_id?: string
          id?: string
          last_position_seconds?: number
          lesson_id?: string
          updated_at?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "training_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_attempts: {
        Row: {
          answers_json: Json
          created_at: string
          enrollment_id: string
          id: string
          lesson_id: string
          passed: boolean
          score_pct: number
        }
        Insert: {
          answers_json?: Json
          created_at?: string
          enrollment_id: string
          id?: string
          lesson_id: string
          passed?: boolean
          score_pct?: number
        }
        Update: {
          answers_json?: Json
          created_at?: string
          enrollment_id?: string
          id?: string
          lesson_id?: string
          passed?: boolean
          score_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_attempts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "training_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      ttos_ai_decisions: {
        Row: {
          agency_id: string
          confidence: number | null
          created_at: string
          id: string
          kind: string
          reason: string | null
          recommendation: Json
          reviewed_at: string | null
          reviewer_id: string | null
          run_id: string | null
          status: string
        }
        Insert: {
          agency_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          kind: string
          reason?: string | null
          recommendation: Json
          reviewed_at?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          status?: string
        }
        Update: {
          agency_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          kind?: string
          reason?: string | null
          recommendation?: Json
          reviewed_at?: string | null
          reviewer_id?: string | null
          run_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ttos_ai_decisions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ttos_automation_runs: {
        Row: {
          agency_id: string
          attempts: number
          automation_id: string
          error: string | null
          event_id: string | null
          id: string
          output: Json | null
          ran_at: string
          status: string
        }
        Insert: {
          agency_id: string
          attempts?: number
          automation_id: string
          error?: string | null
          event_id?: string | null
          id?: string
          output?: Json | null
          ran_at?: string
          status: string
        }
        Update: {
          agency_id?: string
          attempts?: number
          automation_id?: string
          error?: string | null
          event_id?: string | null
          id?: string
          output?: Json | null
          ran_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ttos_automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "ttos_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ttos_automation_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ttos_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ttos_automation_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ttos_timeline"
            referencedColumns: ["id"]
          },
        ]
      }
      ttos_automations: {
        Row: {
          actions: Json
          agency_id: string
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          id: string
          name: string
          priority: number
          retries: number
          trigger_event: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          agency_id: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          priority?: number
          retries?: number
          trigger_event: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          agency_id?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          priority?: number
          retries?: number
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      ttos_event_subscribers: {
        Row: {
          created_at: string
          enabled: boolean
          event_pattern: string
          handler_key: string
          id: string
          module: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_pattern: string
          handler_key: string
          id?: string
          module: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_pattern?: string
          handler_key?: string
          id?: string
          module?: string
        }
        Relationships: []
      }
      ttos_events: {
        Row: {
          actor_id: string | null
          agency_id: string
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          module: string
          name: string
          processed_at: string | null
          related_objects: Json
          status: string
        }
        Insert: {
          actor_id?: string | null
          agency_id: string
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          module: string
          name: string
          processed_at?: string | null
          related_objects?: Json
          status?: string
        }
        Update: {
          actor_id?: string | null
          agency_id?: string
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          module?: string
          name?: string
          processed_at?: string | null
          related_objects?: Json
          status?: string
        }
        Relationships: []
      }
      ttos_jobs: {
        Row: {
          agency_id: string | null
          attempts: number
          created_at: string
          id: string
          kind: string
          last_error: string | null
          locked_by: string | null
          locked_until: string | null
          max_attempts: number
          payload: Json
          result: Json | null
          run_after: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          attempts?: number
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          locked_by?: string | null
          locked_until?: string | null
          max_attempts?: number
          payload?: Json
          result?: Json | null
          run_after?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          attempts?: number
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          locked_by?: string | null
          locked_until?: string | null
          max_attempts?: number
          payload?: Json
          result?: Json | null
          run_after?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ttos_message_threads: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string | null
          participants: string[]
          subject: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          participants?: string[]
          subject?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          participants?: string[]
          subject?: string | null
        }
        Relationships: []
      }
      ttos_messages: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          id: string
          read_by: string[]
          sender_id: string
          thread_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          created_at?: string
          id?: string
          read_by?: string[]
          sender_id: string
          thread_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          id?: string
          read_by?: string[]
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ttos_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ttos_message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ttos_notification_deliveries: {
        Row: {
          acknowledged_at: string | null
          agency_id: string
          attempts: number
          channel: string
          created_at: string
          delivered_at: string | null
          id: string
          last_error: string | null
          notification_id: string
          opened_at: string | null
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          agency_id: string
          attempts?: number
          channel: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          notification_id: string
          opened_at?: string | null
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          agency_id?: string
          attempts?: number
          channel?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          notification_id?: string
          opened_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ttos_notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      ttos_notifications: {
        Row: {
          agency_id: string
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          level: string
          metadata: Json
          read_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          agency_id: string
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          level?: string
          metadata?: Json
          read_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          agency_id?: string
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          level?: string
          metadata?: Json
          read_at?: string | null
          recipient_id?: string
          title?: string
        }
        Relationships: []
      }
      ttos_org_settings: {
        Row: {
          agency_id: string
          ai_preferences: Json
          approval_rules: Json
          automation_defaults: Json
          branding: Json
          compliance_defaults: Json
          document_retention: Json
          notifications: Json
          payroll_defaults: Json
          security_policies: Json
          updated_at: string
        }
        Insert: {
          agency_id: string
          ai_preferences?: Json
          approval_rules?: Json
          automation_defaults?: Json
          branding?: Json
          compliance_defaults?: Json
          document_retention?: Json
          notifications?: Json
          payroll_defaults?: Json
          security_policies?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string
          ai_preferences?: Json
          approval_rules?: Json
          automation_defaults?: Json
          branding?: Json
          compliance_defaults?: Json
          document_retention?: Json
          notifications?: Json
          payroll_defaults?: Json
          security_policies?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ttos_search_index: {
        Row: {
          agency_id: string
          body: string | null
          entity_id: string
          entity_type: string
          id: string
          subtitle: string | null
          tags: string[]
          title: string
          tsv: unknown
          updated_at: string
        }
        Insert: {
          agency_id: string
          body?: string | null
          entity_id: string
          entity_type: string
          id?: string
          subtitle?: string | null
          tags?: string[]
          title: string
          tsv?: unknown
          updated_at?: string
        }
        Update: {
          agency_id?: string
          body?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          subtitle?: string | null
          tags?: string[]
          title?: string
          tsv?: unknown
          updated_at?: string
        }
        Relationships: []
      }
      ttos_tasks: {
        Row: {
          agency_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          dependencies: string[]
          description: string | null
          due_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          owner_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          dependencies?: string[]
          description?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          owner_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          dependencies?: string[]
          description?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          owner_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      woic_api_registry: {
        Row: {
          action: string
          description: string
          id: string
          request_schema: Json
          response_schema: Json
          service: string
          updated_at: string
          version: string
        }
        Insert: {
          action: string
          description?: string
          id?: string
          request_schema?: Json
          response_schema?: Json
          service: string
          updated_at?: string
          version?: string
        }
        Update: {
          action?: string
          description?: string
          id?: string
          request_schema?: Json
          response_schema?: Json
          service?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      woic_compliance_events: {
        Row: {
          agency_id: string
          created_at: string
          effective_at: string | null
          evidence_url: string | null
          expires_at: string | null
          id: string
          identity_id: string | null
          metadata: Json
          next_action_at: string | null
          rule_id: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          effective_at?: string | null
          evidence_url?: string | null
          expires_at?: string | null
          id?: string
          identity_id?: string | null
          metadata?: Json
          next_action_at?: string | null
          rule_id: string
          status: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          effective_at?: string | null
          evidence_url?: string | null
          expires_at?: string | null
          id?: string
          identity_id?: string | null
          metadata?: Json
          next_action_at?: string | null
          rule_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "woic_compliance_events_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "woic_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "woic_compliance_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "woic_compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      woic_compliance_rules: {
        Row: {
          active: boolean
          agency_id: string | null
          applies_to: Json
          cadence: string
          code: string
          created_at: string
          custom_days: number | null
          description: string | null
          grace_days: number
          id: string
          kind: string
          name: string
        }
        Insert: {
          active?: boolean
          agency_id?: string | null
          applies_to?: Json
          cadence?: string
          code: string
          created_at?: string
          custom_days?: number | null
          description?: string | null
          grace_days?: number
          id?: string
          kind: string
          name: string
        }
        Update: {
          active?: boolean
          agency_id?: string | null
          applies_to?: Json
          cadence?: string
          code?: string
          created_at?: string
          custom_days?: number | null
          description?: string | null
          grace_days?: number
          id?: string
          kind?: string
          name?: string
        }
        Relationships: []
      }
      woic_context_sessions: {
        Row: {
          active_role: string | null
          agency_id: string
          compliance_state: Json
          current_client_id: string | null
          current_job_id: string | null
          current_worker_id: string | null
          current_workflow: string | null
          id: string
          recent_activity: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active_role?: string | null
          agency_id: string
          compliance_state?: Json
          current_client_id?: string | null
          current_job_id?: string | null
          current_worker_id?: string | null
          current_workflow?: string | null
          id?: string
          recent_activity?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active_role?: string | null
          agency_id?: string
          compliance_state?: Json
          current_client_id?: string | null
          current_job_id?: string | null
          current_worker_id?: string | null
          current_workflow?: string | null
          id?: string
          recent_activity?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      woic_conversation_messages: {
        Row: {
          body: string
          channel: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          metadata: Json
          sender: string | null
        }
        Insert: {
          body?: string
          channel: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          metadata?: Json
          sender?: string | null
        }
        Update: {
          body?: string
          channel?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json
          sender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "woic_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "woic_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      woic_conversations: {
        Row: {
          agency_id: string
          channels: string[]
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          last_activity_at: string
          participants: Json
          subject: string
          summary: string | null
          unanswered: boolean
        }
        Insert: {
          agency_id: string
          channels?: string[]
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          last_activity_at?: string
          participants?: Json
          subject?: string
          summary?: string | null
          unanswered?: boolean
        }
        Update: {
          agency_id?: string
          channels?: string[]
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          last_activity_at?: string
          participants?: Json
          subject?: string
          summary?: string | null
          unanswered?: boolean
        }
        Relationships: []
      }
      woic_decision_evidence: {
        Row: {
          created_at: string
          data: Json
          decision_id: string
          id: string
          kind: string
          ref_entity: string | null
          ref_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          decision_id: string
          id?: string
          kind: string
          ref_entity?: string | null
          ref_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          decision_id?: string
          id?: string
          kind?: string
          ref_entity?: string | null
          ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "woic_decision_evidence_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "woic_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      woic_decisions: {
        Row: {
          agency_id: string
          alternative_options: Json
          approver_id: string | null
          confidence: number
          created_at: string
          id: string
          impact: string
          kind: string
          outcome: string | null
          reasoning: string
          risk: string
          source: Json
          subject_entity: string | null
          subject_id: string | null
        }
        Insert: {
          agency_id: string
          alternative_options?: Json
          approver_id?: string | null
          confidence?: number
          created_at?: string
          id?: string
          impact?: string
          kind: string
          outcome?: string | null
          reasoning?: string
          risk?: string
          source?: Json
          subject_entity?: string | null
          subject_id?: string | null
        }
        Update: {
          agency_id?: string
          alternative_options?: Json
          approver_id?: string | null
          confidence?: number
          created_at?: string
          id?: string
          impact?: string
          kind?: string
          outcome?: string | null
          reasoning?: string
          risk?: string
          source?: Json
          subject_entity?: string | null
          subject_id?: string | null
        }
        Relationships: []
      }
      woic_identities: {
        Row: {
          activity_score: number
          ai_profile: Json
          auth_user_id: string | null
          availability: Json
          behavior_profile: Json
          certifications: Json
          communication_prefs: Json
          created_at: string
          display_name: string
          documents: Json
          education: Json
          employment_history: Json
          id: string
          knowledge_profile: Json
          licenses: Json
          primary_email: string | null
          primary_phone: string | null
          reputation_score: number
          security_settings: Json
          skills: Json
          training_history: Json
          updated_at: string
        }
        Insert: {
          activity_score?: number
          ai_profile?: Json
          auth_user_id?: string | null
          availability?: Json
          behavior_profile?: Json
          certifications?: Json
          communication_prefs?: Json
          created_at?: string
          display_name?: string
          documents?: Json
          education?: Json
          employment_history?: Json
          id?: string
          knowledge_profile?: Json
          licenses?: Json
          primary_email?: string | null
          primary_phone?: string | null
          reputation_score?: number
          security_settings?: Json
          skills?: Json
          training_history?: Json
          updated_at?: string
        }
        Update: {
          activity_score?: number
          ai_profile?: Json
          auth_user_id?: string | null
          availability?: Json
          behavior_profile?: Json
          certifications?: Json
          communication_prefs?: Json
          created_at?: string
          display_name?: string
          documents?: Json
          education?: Json
          employment_history?: Json
          id?: string
          knowledge_profile?: Json
          licenses?: Json
          primary_email?: string | null
          primary_phone?: string | null
          reputation_score?: number
          security_settings?: Json
          skills?: Json
          training_history?: Json
          updated_at?: string
        }
        Relationships: []
      }
      woic_identity_memberships: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          identity_id: string
          kind: string
          metadata: Json
          status: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          identity_id: string
          kind: string
          metadata?: Json
          status?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          identity_id?: string
          kind?: string
          metadata?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "woic_identity_memberships_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "woic_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      woic_knowledge_articles: {
        Row: {
          agency_id: string
          body: string
          category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          permissions: Json
          status: string
          tags: string[]
          title: string
          tsv: unknown
          updated_at: string
          version: number
        }
        Insert: {
          agency_id: string
          body?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          permissions?: Json
          status?: string
          tags?: string[]
          title: string
          tsv?: unknown
          updated_at?: string
          version?: number
        }
        Update: {
          agency_id?: string
          body?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          permissions?: Json
          status?: string
          tags?: string[]
          title?: string
          tsv?: unknown
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "woic_knowledge_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "woic_knowledge_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      woic_knowledge_categories: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "woic_knowledge_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "woic_knowledge_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      woic_knowledge_vectors: {
        Row: {
          agency_id: string
          article_id: string
          created_at: string
          embedding: string
          model: string
        }
        Insert: {
          agency_id: string
          article_id: string
          created_at?: string
          embedding: string
          model?: string
        }
        Update: {
          agency_id?: string
          article_id?: string
          created_at?: string
          embedding?: string
          model?: string
        }
        Relationships: [
          {
            foreignKeyName: "woic_knowledge_vectors_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "woic_knowledge_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      woic_knowledge_versions: {
        Row: {
          article_id: string
          body: string
          edited_at: string
          edited_by: string | null
          id: string
          tags: string[]
          title: string
          version: number
        }
        Insert: {
          article_id: string
          body: string
          edited_at?: string
          edited_by?: string | null
          id?: string
          tags?: string[]
          title: string
          version: number
        }
        Update: {
          article_id?: string
          body?: string
          edited_at?: string
          edited_by?: string | null
          id?: string
          tags?: string[]
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "woic_knowledge_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "woic_knowledge_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      woic_learning_history: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          kind: string
          outcome: Json
          prediction_id: string | null
          subject_entity: string | null
          subject_id: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          kind: string
          outcome: Json
          prediction_id?: string | null
          subject_entity?: string | null
          subject_id?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          kind?: string
          outcome?: Json
          prediction_id?: string | null
          subject_entity?: string | null
          subject_id?: string | null
        }
        Relationships: []
      }
      woic_org_memory: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          key: string
          kind: string
          updated_at: string
          value: Json
          weight: number
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          key: string
          kind: string
          updated_at?: string
          value: Json
          weight?: number
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          key?: string
          kind?: string
          updated_at?: string
          value?: Json
          weight?: number
        }
        Relationships: []
      }
      woic_prediction_models: {
        Row: {
          agency_id: string | null
          created_at: string
          description: string | null
          endpoint: string | null
          feature_set: Json
          id: string
          name: string
          status: string
          version: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          description?: string | null
          endpoint?: string | null
          feature_set?: Json
          id?: string
          name: string
          status?: string
          version?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          description?: string | null
          endpoint?: string | null
          feature_set?: Json
          id?: string
          name?: string
          status?: string
          version?: string
        }
        Relationships: []
      }
      woic_prediction_results: {
        Row: {
          agency_id: string
          confidence: number
          features_snapshot: Json
          id: string
          model_id: string
          prediction: Json
          produced_at: string
          subject_entity: string
          subject_id: string
        }
        Insert: {
          agency_id: string
          confidence?: number
          features_snapshot?: Json
          id?: string
          model_id: string
          prediction: Json
          produced_at?: string
          subject_entity: string
          subject_id: string
        }
        Update: {
          agency_id?: string
          confidence?: number
          features_snapshot?: Json
          id?: string
          model_id?: string
          prediction?: Json
          produced_at?: string
          subject_entity?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "woic_prediction_results_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "woic_prediction_models"
            referencedColumns: ["id"]
          },
        ]
      }
      woic_recommendations: {
        Row: {
          agency_id: string
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          reasoning: string
          score: number
          status: string
          subject_entity: string | null
          subject_id: string | null
          target_entity: string | null
          target_id: string | null
          updated_at: string
          why: Json
        }
        Insert: {
          agency_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          kind: string
          reasoning?: string
          score?: number
          status?: string
          subject_entity?: string | null
          subject_id?: string | null
          target_entity?: string | null
          target_id?: string | null
          updated_at?: string
          why?: Json
        }
        Update: {
          agency_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          reasoning?: string
          score?: number
          status?: string
          subject_entity?: string | null
          subject_id?: string | null
          target_entity?: string | null
          target_id?: string | null
          updated_at?: string
          why?: Json
        }
        Relationships: []
      }
      woic_service_registry: {
        Row: {
          description: string
          endpoint: string | null
          id: string
          metadata: Json
          service: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          description?: string
          endpoint?: string | null
          id?: string
          metadata?: Json
          service: string
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          description?: string
          endpoint?: string | null
          id?: string
          metadata?: Json
          service?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      worker_credentials: {
        Row: {
          created_at: string
          credential_id: string | null
          document_path: string | null
          expires_on: string | null
          id: string
          issued_on: string | null
          issuer: string | null
          name: string
          notes: string | null
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          document_path?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          issuer?: string | null
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          document_path?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          issuer?: string | null
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_credentials_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_credentials_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_credentials_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_credentials_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          id: string
          is_sensitive: boolean
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_name: string
          id?: string
          is_sensitive?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          id?: string
          is_sensitive?: boolean
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_documents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_documents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_documents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_profiles: {
        Row: {
          availability_json: Json
          bio: string | null
          completion_score: number
          completion_updated_at: string | null
          created_at: string
          desired_pay_max: number | null
          desired_pay_min: number | null
          general_location: string | null
          languages: string[] | null
          preferred_industries: string[] | null
          preferred_job_types: string[] | null
          preferred_name: string | null
          rehire_eligible: boolean | null
          shift_preferences: string[] | null
          trade_specialties: string[] | null
          transportation_status: string | null
          travel_radius_miles: number | null
          updated_at: string
          worker_id: string
          years_experience: number | null
        }
        Insert: {
          availability_json?: Json
          bio?: string | null
          completion_score?: number
          completion_updated_at?: string | null
          created_at?: string
          desired_pay_max?: number | null
          desired_pay_min?: number | null
          general_location?: string | null
          languages?: string[] | null
          preferred_industries?: string[] | null
          preferred_job_types?: string[] | null
          preferred_name?: string | null
          rehire_eligible?: boolean | null
          shift_preferences?: string[] | null
          trade_specialties?: string[] | null
          transportation_status?: string | null
          travel_radius_miles?: number | null
          updated_at?: string
          worker_id: string
          years_experience?: number | null
        }
        Update: {
          availability_json?: Json
          bio?: string | null
          completion_score?: number
          completion_updated_at?: string | null
          created_at?: string
          desired_pay_max?: number | null
          desired_pay_min?: number | null
          general_location?: string | null
          languages?: string[] | null
          preferred_industries?: string[] | null
          preferred_job_types?: string[] | null
          preferred_name?: string | null
          rehire_eligible?: boolean | null
          shift_preferences?: string[] | null
          trade_specialties?: string[] | null
          transportation_status?: string | null
          travel_radius_miles?: number | null
          updated_at?: string
          worker_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_profiles_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_profiles_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_profiles_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_references: {
        Row: {
          created_at: string
          email: string | null
          employer: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          relationship: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          employer?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          employer?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_references_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_references_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_references_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_skills: {
        Row: {
          created_at: string
          id: string
          proficiency: string | null
          skill_id: string
          worker_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          proficiency?: string | null
          skill_id: string
          worker_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          proficiency?: string | null
          skill_id?: string
          worker_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_skills_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "blind_candidate_view"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_skills_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_readiness"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_skills_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          agency_id: string
          classification: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          middle_name: string | null
          nccer_cert: boolean
          osha_cert: boolean
          phone: string | null
          trade: string | null
          user_id: string | null
          worker_code: string | null
        }
        Insert: {
          agency_id: string
          classification?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          middle_name?: string | null
          nccer_cert?: boolean
          osha_cert?: boolean
          phone?: string | null
          trade?: string | null
          user_id?: string | null
          worker_code?: string | null
        }
        Update: {
          agency_id?: string
          classification?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          middle_name?: string | null
          nccer_cert?: boolean
          osha_cert?: boolean
          phone?: string | null
          trade?: string | null
          user_id?: string | null
          worker_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      blind_candidate_view: {
        Row: {
          agency_id: string | null
          certificate_count: number | null
          completion_score: number | null
          desired_pay_max: number | null
          desired_pay_min: number | null
          general_location: string | null
          preferred_industries: string[] | null
          preferred_job_types: string[] | null
          shift_preferences: string[] | null
          skill_ids: string[] | null
          trade_specialties: string[] | null
          travel_radius_miles: number | null
          verified_credential_count: number | null
          worker_id: string | null
          years_experience: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ttos_calendar: {
        Row: {
          agency_id: string | null
          end_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          kind: string | null
          start_at: string | null
          title: string | null
        }
        Relationships: []
      }
      ttos_timeline: {
        Row: {
          actor_id: string | null
          agency_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          metadata: Json | null
          module: string | null
          name: string | null
        }
        Insert: {
          actor_id?: string | null
          agency_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          metadata?: Json | null
          module?: string | null
          name?: string | null
        }
        Update: {
          actor_id?: string | null
          agency_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          metadata?: Json | null
          module?: string | null
          name?: string | null
        }
        Relationships: []
      }
      worker_readiness: {
        Row: {
          agency_id: string | null
          cleared_for_assignment: boolean | null
          onboarding_stage:
            | Database["public"]["Enums"]["onboarding_stage"]
            | null
          worker_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_rate_limit: {
        Args: { _key: string; _max_requests: number; _window_seconds: number }
        Returns: boolean
      }
      has_module_access: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      next_ticket_number: { Args: { _agency_id: string }; Returns: string }
    }
    Enums: {
      adverse_action_stage:
        | "pre_adverse_sent"
        | "waiting_period"
        | "final_adverse_sent"
        | "withdrawn"
      app_role:
        | "super_admin"
        | "agency_admin"
        | "dispatcher"
        | "payroll"
        | "viewer"
        | "client_user"
        | "worker_user"
        | "agency_owner"
        | "recruiter"
        | "account_manager"
        | "onboarding_specialist"
        | "compliance_specialist"
        | "scheduler"
        | "payroll_specialist"
        | "billing_specialist"
        | "client_hiring_manager"
        | "client_supervisor"
        | "candidate"
      application_status:
        | "new"
        | "screening"
        | "submitted"
        | "interview"
        | "offer"
        | "placed"
        | "rejected"
        | "withdrawn"
      decision_type:
        | "advance"
        | "reject"
        | "hold"
        | "submit_to_client"
        | "client_accept"
        | "client_reject"
        | "offer_extend"
        | "offer_accept"
        | "offer_decline"
        | "placement"
      document_status: "draft" | "active" | "archived"
      job_order_status:
        | "draft"
        | "open"
        | "on_hold"
        | "filled"
        | "cancelled"
        | "closed"
      onboarding_scope:
        | "universal"
        | "agency"
        | "client"
        | "job"
        | "location"
        | "state"
        | "industry"
      onboarding_stage:
        | "sourced"
        | "applied"
        | "screening"
        | "interviewing"
        | "offered"
        | "documents"
        | "training"
        | "compliance"
        | "ready"
        | "placed"
        | "on_hold"
        | "rejected"
      pdf_type:
        | "draft"
        | "agency_copy"
        | "client_copy"
        | "worker_copy"
        | "rejected_copy"
        | "corrected_copy"
      screening_status:
        | "pending"
        | "invited"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "error"
      signer_type: "client" | "agency" | "worker"
      ticket_status:
        | "draft"
        | "sent"
        | "viewed"
        | "signed"
        | "rejected"
        | "corrected"
        | "closed"
      ticket_type: "daily" | "weekly"
      training_enrollment_status:
        | "enrolled"
        | "in_progress"
        | "completed"
        | "expired"
        | "revoked"
      training_lesson_type: "video" | "reading" | "quiz"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      adverse_action_stage: [
        "pre_adverse_sent",
        "waiting_period",
        "final_adverse_sent",
        "withdrawn",
      ],
      app_role: [
        "super_admin",
        "agency_admin",
        "dispatcher",
        "payroll",
        "viewer",
        "client_user",
        "worker_user",
        "agency_owner",
        "recruiter",
        "account_manager",
        "onboarding_specialist",
        "compliance_specialist",
        "scheduler",
        "payroll_specialist",
        "billing_specialist",
        "client_hiring_manager",
        "client_supervisor",
        "candidate",
      ],
      application_status: [
        "new",
        "screening",
        "submitted",
        "interview",
        "offer",
        "placed",
        "rejected",
        "withdrawn",
      ],
      decision_type: [
        "advance",
        "reject",
        "hold",
        "submit_to_client",
        "client_accept",
        "client_reject",
        "offer_extend",
        "offer_accept",
        "offer_decline",
        "placement",
      ],
      document_status: ["draft", "active", "archived"],
      job_order_status: [
        "draft",
        "open",
        "on_hold",
        "filled",
        "cancelled",
        "closed",
      ],
      onboarding_scope: [
        "universal",
        "agency",
        "client",
        "job",
        "location",
        "state",
        "industry",
      ],
      onboarding_stage: [
        "sourced",
        "applied",
        "screening",
        "interviewing",
        "offered",
        "documents",
        "training",
        "compliance",
        "ready",
        "placed",
        "on_hold",
        "rejected",
      ],
      pdf_type: [
        "draft",
        "agency_copy",
        "client_copy",
        "worker_copy",
        "rejected_copy",
        "corrected_copy",
      ],
      screening_status: [
        "pending",
        "invited",
        "in_progress",
        "completed",
        "cancelled",
        "error",
      ],
      signer_type: ["client", "agency", "worker"],
      ticket_status: [
        "draft",
        "sent",
        "viewed",
        "signed",
        "rejected",
        "corrected",
        "closed",
      ],
      ticket_type: ["daily", "weekly"],
      training_enrollment_status: [
        "enrolled",
        "in_progress",
        "completed",
        "expired",
        "revoked",
      ],
      training_lesson_type: ["video", "reading", "quiz"],
    },
  },
} as const
