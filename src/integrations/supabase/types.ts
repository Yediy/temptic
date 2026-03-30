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
      agencies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          branch_name: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          state: string | null
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
          logo_url?: string | null
          name: string
          phone?: string | null
          state?: string | null
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
          logo_url?: string | null
          name?: string
          phone?: string | null
          state?: string | null
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
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      current_user_agency_ids: { Args: never; Returns: string[] }
      current_user_client_ids: { Args: never; Returns: string[] }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      current_user_worker_ids: { Args: never; Returns: string[] }
      get_user_agency_id: { Args: { _user_id: string }; Returns: string }
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      get_user_worker_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_ticket_number: { Args: { _agency_id: string }; Returns: string }
      register_agency:
        | { Args: { _agency_name: string }; Returns: string }
        | { Args: { _agency_name: string; _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "agency_admin"
        | "dispatcher"
        | "payroll"
        | "viewer"
        | "client_user"
        | "worker_user"
      pdf_type:
        | "draft"
        | "agency_copy"
        | "client_copy"
        | "worker_copy"
        | "rejected_copy"
        | "corrected_copy"
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
      app_role: [
        "super_admin",
        "agency_admin",
        "dispatcher",
        "payroll",
        "viewer",
        "client_user",
        "worker_user",
      ],
      pdf_type: [
        "draft",
        "agency_copy",
        "client_copy",
        "worker_copy",
        "rejected_copy",
        "corrected_copy",
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
    },
  },
} as const
