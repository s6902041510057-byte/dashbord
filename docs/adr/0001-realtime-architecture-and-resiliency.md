# ADR 0001: Real-time Architecture, Connection Resiliency, and Database Persistence

## Context

We are building a live, real-time classroom group quiz game themed around cosmic space. The platform supports two roles: Teachers (hosts) and Students (players). To ensure a smooth classroom experience, the system requires:
1. **Low-latency real-time synchronization** for multi-player flows (Lobby, grouping, live voting, respondent rotation, game loop, scores, and leaderboards).
2. **High connection resiliency** because classroom Wi-Fi/networks can be unstable; students must recover their state seamlessly on disconnect/refresh without teacher intervention.
3. **Persistent Question Banks** so teachers can prepare and save quizzes in advance.

The deployment target is Vercel (serverless frontend), which poses challenges for traditional long-running WebSocket servers (like Socket.io on serverless functions).

## Decision

We decided on the following architectural stack and patterns:

1. **Real-time Engine**: Use **Supabase Realtime** (specifically Broadcast and Presence features) combined with PostgreSQL.
   - **Broadcast** will handle transient events (like countdown ticks, grouping animations, game triggers).
   - **Presence** will track active student heartbeats and connection states in the Lobby.
   - This fits perfectly with Vercel hosting as it offloads connection handling from serverless functions.
2. **Resiliency**: Implement **Session-Based Auto-Reconnection** on the client.
   - A unique player token (`Session ID`) is stored in the student's `localStorage` upon joining a room.
   - On disconnect or manual page refresh, the student reconnects and claims their existing state (their group, name, votes, and whether they are currently the Respondent) instantly from the database using their session token.
3. **Teacher's Question Bank Persistence**: Store teachers' question banks in PostgreSQL.
   - Teachers can create, read, update, delete (CRUD), and reorder quizzes, persisting them to their authenticated account.
   - Active game sessions dynamically copy the quiz questions to an active room session table, preserving historical question data.

## Consequences

- **Serverless Compatibility**: No need for a separate dedicated Node.js server for WebSockets. Vercel is highly compatible.
- **Improved UX**: Reduced cognitive load on teachers during active game-play when student connections drop.
- **Scalability**: Supabase handles connection scaling automatically, allowing multiple active classrooms to run simultaneously.
