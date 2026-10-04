# Cosmic EdTech Quiz (Domain Glossary)

This glossary defines the shared terminology for the real-time, classroom-based team quiz application.

## Core Concepts

**Room (ห้องเรียน)**:
An active live session created by a Teacher where students join using a Room Code to compete in groups.
_Avoid_: Class, Server, Lobby (as a synonym for Room).

**Room Code (รหัสเข้าห้อง)**:
A unique code generated when a Teacher creates a Room, allowing Students to join the corresponding Lobby.
_Avoid_: Password, Room ID.

**Lobby (ห้องรอ)**:
The initial waiting area within a Room where Students gather before the Teacher starts the Grouping process.
_Avoid_: Waiting room, Main room.

**Group (กลุ่ม)**:
A team of Students created through the random grouping process to compete together.
_Avoid_: Team, Squad, Clan.

**Random Wheel (วงล้อสุ่ม)**:
The visual interactive component shown to Students during the grouping process, animating the selection of multiple students into a Group.
_Avoid_: Spinner, Roulette.

**Group Leader (หัวหน้ากลุ่ม)**:
A Student voted by their Group members to set the Group's name and choose the Respondent for each question.
_Avoid_: Captain, Admin, Chief.

**Respondent (ผู้ตอบคำถาม)**:
The specific Student within a Group selected by the Group Leader to answer the current question.
_Avoid_: Answerer, Player-of-the-round.

**Question Bank (คลังคำถาม)**:
The set of questions managed by the Teacher, which are used during the Quiz Phase.
_Avoid_: Questionnaire, Quiz List.

**Game Loop (รอบการแข่งขัน)**:
The real-time state sequence of the quiz: Countdown → Question → Answering → Reveal/Leaderboard → Next Question.
_Avoid_: Match, Game flow.
