# Session Management Commands

## Quick Reference

### Primary Commands
- `/start-session` - Initialize development session with tracking
- `/end-session` - Save all changes and generate summary
- `/session-status` - Check current session progress without ending

### Task Management
- `/task-complete [task-name]` - Mark specific task as done
- `/task-block [task-name] [reason]` - Mark task as blocked
- `/task-add [task-name] [category]` - Add new discovered task
- `/task-progress [task-name] [percentage]` - Update task progress

### Documentation
- `/note [text]` - Add a discovery or important note
- `/config-add [key] [value]` - Document new configuration
- `/command-add [command] [description]` - Add new command to CLAUDE.md

### Session Control  
- `/session-pause` - Temporarily pause tracking
- `/session-resume` - Resume tracking
- `/session-cancel` - Cancel without saving
- `/session-history` - View previous sessions

## How to Use

### Starting Your Work Day
```
1. Open your terminal/IDE
2. Type: /start-session
3. Review current sprint and tasks
4. Begin working
```

### During Development
```
- Complete a task: /task-complete "Setup TypeScript"
- Found a blocker: /task-block "eBay integration" "API key pending"
- Discovered something: /note "Vite has HMR issues with Supabase"
- Added config: /config-add "VITE_API_KEY" "Required for service X"
```

### Ending Your Session
```
1. Type: /end-session
2. Review the summary
3. Check updated files
4. Session is saved automatically
```

## Session State Management

### What Gets Tracked Automatically
- File creations and modifications
- Test additions and results
- Build/compile status
- Error occurrences
- Performance metrics

### What You Should Track Manually
- Completed tasks: `/task-complete`
- Important discoveries: `/note`
- Blockers: `/task-block`
- Configuration changes: `/config-add`

## Smart Features

### Auto-Detection
The session system automatically detects:
- New npm packages installed
- Environment variable usage
- API endpoint creation
- Database schema changes
- New route additions

### Intelligent Updates
- Groups related changes together
- Maintains chronological order
- Preserves context between sessions
- Links related tasks

### Progress Calculation
- Sprint completion percentage
- Daily velocity tracking
- Burndown rate
- Estimated completion dates

## Best Practices

### Do's
✅ Start session at beginning of work
✅ Mark tasks complete as you finish them
✅ Document blockers immediately
✅ End session before long breaks
✅ Add notes for future reference

### Don'ts
❌ Don't forget to end sessions
❌ Don't batch task completions
❌ Don't skip documenting blockers
❌ Don't modify session logs directly

## Session File Structure

```
/bolt
├── CLAUDE.md (updated on end-session)
├── TASKMANAGER.md (updated on end-session)
├── SESSION_LOG.md (current session)
└── /sessions
    ├── /2025-08-14
    │   ├── session-001.md
    │   ├── session-002.md
    │   └── summary.md
    └── /archive
        └── [older sessions]
```

## Troubleshooting

### Session Didn't Save
```bash
/session-restore  # Restore from auto-backup
/session-history  # Find previous session
```

### Merge Conflicts
```bash
/session-merge    # Smart merge resolution
/session-diff     # View differences
```

### Lost Progress
```bash
/session-recover  # Attempt recovery from cache
/session-backup   # Force backup current state
```

## Integration with Git

### Recommended Workflow
```bash
/start-session
# ... do work ...
/end-session
git add .
git commit -m "Session: [auto-generated message]"
git push
```

### Auto-Commit Option
Enable in settings to automatically commit on session end:
```json
{
  "session": {
    "autoCommit": true,
    "commitPrefix": "Session:",
    "includeSummary": true
  }
}
```

## Metrics & Reporting

### Daily Report
```
/session-report daily
```

### Sprint Report
```
/session-report sprint
```

### Custom Range
```
/session-report --from 2025-08-01 --to 2025-08-14
```

## Advanced Usage

### Templates
Create custom session templates for different work types:
- `/start-session --template feature`
- `/start-session --template bugfix`
- `/start-session --template refactor`

### Webhooks
Configure webhooks for session events:
- Session start/end
- Task completion
- Blocker encountered
- Milestone reached

### Integrations
- Export to Jira/Linear
- Sync with calendar
- Generate timesheets
- Create burndown charts

---

*These commands help maintain accurate project documentation and provide valuable insights into development progress and velocity.*