# /end-session Command

## Purpose
This command finalizes a development session by:
1. Saving all tracked changes to CLAUDE.md and TASKMANAGER.md
2. Generating a session summary
3. Updating task completion status
4. Archiving session log

## Usage
Type `/end-session` to complete tracking and save all updates

## Session Finalization Process

### On Session End:
1. **Compile Session Changes**
   - Gather all completed tasks
   - Collect new discoveries
   - Compile configuration changes
   - Summarize blockers encountered

2. **Update TASKMANAGER.md**
   - Mark completed tasks with [✓]
   - Add new subtasks discovered
   - Update task priorities
   - Move blocked tasks to [❌]
   - Update current sprint focus
   - Calculate completion percentage

3. **Update CLAUDE.md**
   - Add new environment variables
   - Update development commands
   - Document new API integrations
   - Add discovered patterns
   - Update architecture notes
   - Include important gotchas

4. **Generate Session Summary**
   - Total time worked
   - Tasks completed count
   - Lines of code changed
   - Files created/modified
   - Blockers encountered
   - Next session priorities

## Update Templates

### TASKMANAGER.md Updates
```markdown
## 🎯 Current Sprint Focus
**Last Updated:** [timestamp]
**Completion:** X% (Y of Z tasks)

### Recently Completed:
- [✓] Task name (completed: date/time)

### New Discoveries:
- [ ] New subtask identified during development

### Blockers:
- [❌] Blocked task - reason
```

### CLAUDE.md Updates
```markdown
## Recent Updates (Session: [date])

### New Commands Discovered:
- `npm run [command]` - Description

### Configuration Changes:
- Added environment variable: VARIABLE_NAME

### Architecture Updates:
- Implemented [pattern/structure]

### Important Notes:
- Discovery or gotcha learned
```

## Session Summary Format
```markdown
# Session Summary - [Date/Time]

## 📊 Statistics
- **Duration:** 2h 30m
- **Tasks Completed:** 5
- **Tasks Blocked:** 1
- **Files Modified:** 12
- **New Files:** 3
- **Tests Added:** 8

## ✅ Completed Tasks
1. Setup Development Environment
2. Initialize Next.js project
3. Configure TypeScript
4. Setup Tailwind CSS
5. Create initial components

## 🚧 In Progress
- User authentication system (60% complete)
- Database schema design

## ❌ Blockers
- eBay API access pending approval
- Need clarification on payment flow

## 🔄 Codebase Changes
- Created /src/components structure
- Added authentication context
- Implemented base API client
- Setup environment configuration

## 📝 Notes & Discoveries
- Next.js 14 App Router requires different approach
- Supabase auth works well with PKCE flow
- Consider using Zustand over Redux for state

## 🎯 Next Session Priorities
1. Complete authentication flow
2. Begin photo upload system
3. Setup AWS S3 integration

## 💡 Recommendations
- Consider migrating to Next.js from current Vite setup
- Implement error boundary components early
- Add comprehensive logging system
```

## Archive Process

### Session Logs
- Save to `/sessions/YYYY-MM-DD-session.md`
- Include full activity log
- Preserve context for future reference
- Track velocity metrics

### Metrics Tracking
```json
{
  "date": "2025-08-14",
  "duration": 150,
  "tasksCompleted": 5,
  "taskVelocity": 2.0,
  "filesChanged": 12,
  "linesAdded": 450,
  "linesRemoved": 120,
  "testsAdded": 8,
  "coverage": "72%"
}
```

## Auto-Save Triggers
- Before making bulk updates
- When detecting pattern changes
- After completing major milestones
- Every 30 minutes of active work
- When context window approaching limit

## Rollback Support
- Previous versions kept in `/sessions/archive/`
- Can restore from any session point
- Diff view available for changes
- Undo last session if needed

## Integration Points

### Git Integration
```bash
# Auto-generate commit message from session
git commit -m "Session [ID]: Completed [X] tasks, [description]"
```

### Project Management
- Can export to Jira/Linear format
- Generate sprint reports
- Track velocity trends
- Estimate completion dates

## Example Output
```
📋 Session Complete!
⏱️ Duration: 2h 30m
✅ Tasks Completed: 5/7
📁 Files Modified: 12
🧪 Tests Added: 8

Updates saved to:
- TASKMANAGER.md ✓
- CLAUDE.md ✓
- SESSION_LOG.md ✓

Session archived to: /sessions/2025-08-14-001.md

Great progress! Next priorities:
1. Complete auth system
2. Setup photo upload
3. Integrate AI services

Type /start-session to begin your next session.
```

## Error Handling
- Auto-backup before updates
- Validation of changes
- Conflict resolution
- Manual review option
- Recovery from failures

## Related Commands
- `/start-session` - Begin a new tracked session
- `/session-status` - Check without ending
- `/session-restore` - Restore from previous
- `/session-history` - View past sessions

---

*Note: Always run /end-session before closing your development environment to ensure all progress is properly tracked and saved.*