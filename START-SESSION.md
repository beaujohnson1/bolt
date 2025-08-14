# /start-session Command

## Purpose
This command initializes a development session by:
1. Reading current state from CLAUDE.md and TASKMANAGER.md
2. Setting up session tracking
3. Creating a session log for changes
4. Preparing for continuous updates

## Usage
Type `/start-session` to begin a tracked development session

## Session Workflow

### On Session Start:
1. **Load Current State**
   - Read CLAUDE.md for project context
   - Read TASKMANAGER.md for current task status
   - Read PRD.md for requirements reference
   - Identify active sprint and priorities

2. **Create Session Log**
   - Generate timestamp
   - Record session start time
   - Create SESSION_LOG.md for tracking changes
   - Note current task focus from TASKMANAGER.md

3. **Track During Session**
   - Monitor completed tasks
   - Track new discoveries about the codebase
   - Note any architectural decisions
   - Record API integrations or configuration changes
   - Track blockers or issues encountered

4. **Update Continuously**
   - Mark tasks as completed in memory
   - Queue updates for documentation
   - Track time spent on tasks
   - Note any deviations from plan

## Session State Structure
```json
{
  "sessionId": "2025-08-14-001",
  "startTime": "2025-08-14T10:00:00Z",
  "currentSprint": "Sprint 1-2: Core Web Application Framework",
  "focusTasks": [],
  "completedTasks": [],
  "newDiscoveries": [],
  "blockers": [],
  "codebaseUpdates": [],
  "configChanges": []
}
```

## What Gets Tracked

### Task Progress
- Tasks moved from [ ] to [✓]
- New subtasks discovered
- Blocked tasks [❌]
- Tasks put on hold [⏸️]

### Codebase Changes
- New files created
- Major refactors
- New dependencies added
- Configuration updates
- Environment variable changes

### Documentation Updates
- New patterns discovered
- Architecture decisions
- API endpoints created
- Database schema changes
- Performance optimizations

### Learning & Insights
- Best practices identified
- Performance bottlenecks found
- Security considerations
- Integration challenges
- User feedback incorporated

## Auto-Update Triggers
- Every 10 significant actions
- When completing a major task
- When encountering a blocker
- When making architectural decisions
- Before context window limits

## Files Modified
- SESSION_LOG.md (created/updated)
- TASKMANAGER.md (prepared for updates)
- CLAUDE.md (prepared for updates)

## Example Session Start Output
```
🚀 Development Session Started
📅 Date: August 14, 2025
⏰ Time: 10:00 AM
🎯 Current Sprint: Sprint 1-2: Core Web Application Framework
📋 Active Tasks: 5
✅ Completed Today: 0
🔄 In Progress: 2

Today's Focus:
1. Setup Development Environment
2. Initialize Next.js/React project
3. Configure authentication system

Session tracking active. Use /end-session to save progress.
```

---

## Related Commands
- `/end-session` - Finalize and save all session updates
- `/session-status` - Check current session progress
- `/task-complete [task-name]` - Mark specific task as done
- `/add-blocker [description]` - Add a blocker to track

---

*Note: This command helps maintain accurate project documentation and task tracking throughout your development workflow.*