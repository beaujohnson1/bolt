// Onboarding Progress Tracker
// Utilities for tracking user progress through the onboarding flow

import { useAuth } from '../contexts/AuthContext';

export interface OnboardingMilestone {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export class OnboardingTracker {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Mark a milestone as completed
  markMilestone(milestone: string, data?: any): void {
    const key = `milestone_${milestone}_${this.userId}`;
    const milestoneData = {
      completed: true,
      completedAt: new Date().toISOString(),
      data: data || {}
    };

    localStorage.setItem(key, JSON.stringify(milestoneData));
    
    console.log(`✅ [ONBOARDING] Milestone "${milestone}" completed for user ${this.userId}`);

    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('onboardingMilestone', {
      detail: {
        milestone,
        userId: this.userId,
        data: milestoneData
      }
    }));
  }

  // Check if a milestone is completed
  isMilestoneCompleted(milestone: string): boolean {
    const key = `milestone_${milestone}_${this.userId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return false;
    
    try {
      const data = JSON.parse(stored);
      return data.completed === true;
    } catch {
      return false;
    }
  }

  // Get milestone data
  getMilestone(milestone: string): OnboardingMilestone | null {
    const key = `milestone_${milestone}_${this.userId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored);
      return {
        id: milestone,
        name: milestone,
        description: '',
        completed: data.completed,
        completedAt: data.completedAt
      };
    } catch {
      return null;
    }
  }

  // Get all completed milestones
  getAllMilestones(): OnboardingMilestone[] {
    const milestones: OnboardingMilestone[] = [];
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(`milestone_`) && key.endsWith(`_${this.userId}`)
    );

    for (const key of keys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '');
        const milestoneId = key.replace(`milestone_`, '').replace(`_${this.userId}`, '');
        
        milestones.push({
          id: milestoneId,
          name: milestoneId,
          description: '',
          completed: data.completed,
          completedAt: data.completedAt
        });
      } catch {
        // Ignore invalid data
      }
    }

    return milestones;
  }

  // Clear all milestones for user
  clearAllMilestones(): void {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(`milestone_`) && key.endsWith(`_${this.userId}`)
    );

    for (const key of keys) {
      localStorage.removeItem(key);
    }

    console.log(`🧹 [ONBOARDING] Cleared all milestones for user ${this.userId}`);
  }
}

// Hook for using onboarding tracker
export const useOnboardingTracker = () => {
  const { authUser } = useAuth();
  
  if (!authUser) {
    throw new Error('useOnboardingTracker must be used with authenticated user');
  }

  const tracker = new OnboardingTracker(authUser.id);

  return {
    markMilestone: tracker.markMilestone.bind(tracker),
    isMilestoneCompleted: tracker.isMilestoneCompleted.bind(tracker),
    getMilestone: tracker.getMilestone.bind(tracker),
    getAllMilestones: tracker.getAllMilestones.bind(tracker),
    clearAllMilestones: tracker.clearAllMilestones.bind(tracker)
  };
};

// Common milestone constants
export const MILESTONES = {
  EBAY_CONNECTED: 'ebay_connected',
  FIRST_PHOTO_UPLOADED: 'first_photo_uploaded', 
  FIRST_ITEM_CREATED: 'first_item_created',
  FIRST_LISTING_GENERATED: 'first_listing_generated',
  FIRST_LISTING_PUBLISHED: 'first_listing_published',
  ONBOARDING_COMPLETED: 'onboarding_completed'
} as const;

export type MilestoneType = typeof MILESTONES[keyof typeof MILESTONES];