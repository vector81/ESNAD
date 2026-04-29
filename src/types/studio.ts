import type { WorkflowStage } from './publication'

export interface Chapter {
  id: string
  publication_id: string
  order: number
  title_ar: string
  title_en: string
  slug: string
  content_json: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Version {
  id: string
  publication_id: string
  created_at: string
  created_by: string
  label: string
  snapshot_json: Record<string, unknown>
}

export interface Comment {
  id: string
  publication_id: string
  chapter_id?: string | null
  thread_id: string
  author: {
    uid: string
    name: string
  }
  text: string
  range: {
    from: number
    to: number
  }
  resolved: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowTransition {
  from: WorkflowStage
  to: WorkflowStage
  label_ar: string
  label_en: string
  variant: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  { from: 'draft', to: 'in_review', label_ar: 'إرسال للمراجعة', label_en: 'Submit for Review', variant: 'primary' },
  { from: 'in_review', to: 'needs_revision', label_ar: 'طلب تعديل', label_en: 'Request Revision', variant: 'danger' },
  { from: 'in_review', to: 'approved', label_ar: 'اعتماد', label_en: 'Approve', variant: 'primary' },
  { from: 'needs_revision', to: 'in_review', label_ar: 'إعادة الإرسال', label_en: 'Resubmit', variant: 'primary' },
  { from: 'approved', to: 'published', label_ar: 'نشر', label_en: 'Publish', variant: 'primary' },
  { from: 'published', to: 'draft', label_ar: 'إرجاع للمسودة', label_en: 'Unpublish', variant: 'ghost' },
]

export function getNextWorkflowStages(current: WorkflowStage): WorkflowTransition[] {
  return WORKFLOW_TRANSITIONS.filter((t) => t.from === current)
}

export function canTransitionTo(from: WorkflowStage, to: WorkflowStage): boolean {
  return WORKFLOW_TRANSITIONS.some((t) => t.from === from && t.to === to)
}

export function getWorkflowStageLabel(stage: WorkflowStage, language: 'ar' | 'en' = 'ar'): string {
  const labels: Record<WorkflowStage, { ar: string; en: string }> = {
    draft: { ar: 'مسودة', en: 'Draft' },
    in_review: { ar: 'قيد المراجعة', en: 'In Review' },
    needs_revision: { ar: 'يحتاج تعديل', en: 'Needs Revision' },
    approved: { ar: 'معتمد', en: 'Approved' },
    published: { ar: 'منشور', en: 'Published' },
  }
  return labels[stage][language]
}
