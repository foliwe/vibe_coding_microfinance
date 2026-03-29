1. PURPOSE
This document defines the complete production-level UI structure for the Credit Union Mobile App.
This file is the single source of truth for:
Designer agent
Planner agent
Coder agent
Reviewer agent
2. CORE PRINCIPLES (CRITICAL)
SYSTEM PRIORITIES

1. OFFLINE-FIRST
2. TRANSACTION STATE VISIBILITY
3. FAST DATA ENTRY
4. USER TRUST (MEMBER VIEW)
5. ZERO AMBIGUITY IN MONEY STATES
3. GLOBAL APP STRUCTURE
┌──────────────────────────────────────────────┐
│ STATUS BAR                                   │
│ [ONLINE] or [OFFLINE] | Sync Count | Time    │
├──────────────────────────────────────────────┤
│ TOP BAR                                      │
│ [←] Title                        [⋮ Menu]    │
├──────────────────────────────────────────────┤
│ MAIN CONTENT                                 │
│                                              │
│ Dynamic content                              │
│                                              │
├──────────────────────────────────────────────┤
│ BOTTOM NAV                                   │
│ [Home] [Transactions] [Members/Loans] [More] │
└──────────────────────────────────────────────┘
4. STATUS SYSTEM (MANDATORY)
SYNC STATES
[OFFLINE]
[ONLINE]
[PENDING SYNC]
[SYNCING]
[FAILED TO SYNC]

APPROVAL STATES
[PENDING APPROVAL]
[APPROVED]
[REJECTED]

RISK / SYSTEM STATES
[FLAGGED]
[RECONCILIATION REQUIRED]
👉 These MUST appear consistently everywhere.
5. LOGIN FLOW
┌──────────────────────────────────────────────┐
│ Login                                        │
├──────────────────────────────────────────────┤
│ Role                                         │
│ [ Agent ▼ ]                                  │
│                                              │
│ Code                                         │
│ [______________________________]             │
│                                              │
│ Password                                     │
│ [______________________________]             │
│                                              │
│ [ Login ]                                    │
│                                              │
│ Status: [ONLINE] / [OFFLINE]                │
└──────────────────────────────────────────────┘
6. AGENT APP
6.1 AGENT NAVIGATION
BOTTOM NAV

[Home] [Transactions] [Members] [More]

MORE MENU:
- Sync Queue
- Cash Reconciliation
- Profile
- Logout
6.2 AGENT HOME
┌──────────────────────────────────────────────┐
│ Home                                         │
├──────────────────────────────────────────────┤
│ Agent: David N.                              │
│ Code: AG-0001                                │
│ Branch: Main                                 │
│                                              │
│ STATUS: [OFFLINE] [3 Pending Sync]           │
├──────────────────────────────────────────────┤
│ QUICK ACTIONS                                │
│                                              │
│ [ + Add Member ]                             │
│ [ + Record Transaction ]                     │
│ [ Sync Queue ]                               │
│ [ Reconcile Cash ]                           │
├──────────────────────────────────────────────┤
│ TODAY SUMMARY                                │
│                                              │
│ Collections: 45,000                          │
│ Withdrawals: 12,000                          │
│ Pending Approvals: 8                         │
│ Pending Sync: 3                              │
├──────────────────────────────────────────────┤
│ RECENT ACTIVITY                              │
│                                              │
│ Deposit    10,000   [PENDING APPROVAL]       │
│ Withdraw    5,000   [PENDING SYNC]           │
│ Savings     2,500   [APPROVED]               │
└──────────────────────────────────────────────┘
6.3 MEMBERS LIST
┌──────────────────────────────────────────────┐
│ Members                           [ + ]       │
├──────────────────────────────────────────────┤
│ [Search________________________]             │
│                                              │
│ Alice K.        MB-0001     Active           │
│ XYZ Group       MB-0002     Active           │
│ Musa Traders    MB-0003     Active           │
└──────────────────────────────────────────────┘
6.4 ADD MEMBER
┌──────────────────────────────────────────────┐
│ Add Member                                   │
├──────────────────────────────────────────────┤
│ Type: [Individual ▼]                         │
│                                              │
│ National ID                                  │
│ [________________________]                  │
│                                              │
│ Photo                                        │
│ [Take Photo]                                 │
│                                              │
│ First Name                                   │
│ [________________________]                  │
│                                              │
│ Last Name                                    │
│ [________________________]                  │
│                                              │
│ Phone                                        │
│ [________________________]                  │
│                                              │
│ [ Save Member ]                              │
└──────────────────────────────────────────────┘
6.5 TRANSACTION FLOW
STEP 1: Select Member
STEP 2: Select Type
STEP 3: Enter Details
STEP 4: Save → STATUS APPLIED
6.6 DEPOSIT SCREEN
┌──────────────────────────────────────────────┐
│ Deposit                                      │
├──────────────────────────────────────────────┤
│ Member: Alice K.                             │
│                                              │
│ Amount                                       │
│ [________________________]                  │
│                                              │
│ Status: [OFFLINE → PENDING SYNC]             │
│                                              │
│ [ Save Deposit ]                             │
└──────────────────────────────────────────────┘
6.7 WITHDRAWAL SCREEN
┌──────────────────────────────────────────────┐
│ Withdrawal                                   │
├──────────────────────────────────────────────┤
│ Member: Alice K.                             │
│                                              │
│ Available: 18,500                            │
│                                              │
│ Amount                                       │
│ [________________________]                  │
│                                              │
│ WARNING: Requires Approval                   │
│                                              │
│ Result: [PENDING APPROVAL]                   │
│                                              │
│ [ Save Withdrawal ]                          │
└──────────────────────────────────────────────┘
6.8 TRANSACTIONS LIST
┌──────────────────────────────────────────────┐
│ Transactions                                 │
├──────────────────────────────────────────────┤
│ Deposit      10,000   [APPROVED]             │
│ Withdraw      5,000   [PENDING APPROVAL]     │
│ Savings       2,500   [PENDING SYNC]         │
│ Deposit       3,000   [FAILED TO SYNC]       │
└──────────────────────────────────────────────┘
6.9 SYNC QUEUE
┌──────────────────────────────────────────────┐
│ Sync Queue                                   │
├──────────────────────────────────────────────┤
│ Status: [OFFLINE]                            │
│                                              │
│ TX-1   Deposit    10,000   Pending           │
│ TX-2   Withdraw    5,000   Failed            │
│                                              │
│ [ Retry Failed ]                             │
│ [ Sync Now ]                                 │
└──────────────────────────────────────────────┘
6.10 CASH RECONCILIATION
┌──────────────────────────────────────────────┐
│ Reconciliation                               │
├──────────────────────────────────────────────┤
│ Expected: 33,000                             │
│                                              │
│ Actual Cash                                  │
│ [________________________]                  │
│                                              │
│ Difference: -2,000                           │
│                                              │
│ [ Submit ]                                   │
└──────────────────────────────────────────────┘
7. MEMBER APP
7.1 MEMBER HOME
┌──────────────────────────────────────────────┐
│ Home                                         │
├──────────────────────────────────────────────┤
│ Name: Alice K.                               │
│ Code: MB-0001                                │
├──────────────────────────────────────────────┤
│ BALANCES                                     │
│ Savings: 40,000                              │
│ Deposit: 20,000                              │
│ Available: 18,500                            │
├──────────────────────────────────────────────┤
│ LOAN                                         │
│ Outstanding: 80,000                          │
│ Next Due: 12 May                             │
├──────────────────────────────────────────────┤
│ TRANSACTIONS                                 │
│ Deposit     10,000   [APPROVED]              │
│ Withdraw     5,000   [PENDING APPROVAL]      │
└──────────────────────────────────────────────┘
7.2 MEMBER TRANSACTIONS
┌──────────────────────────────────────────────┐
│ Transactions                                 │
├──────────────────────────────────────────────┤
│ Deposit      10,000   Approved               │
│ Withdraw      5,000   Pending Approval       │
│ Savings       2,500   Approved               │
└──────────────────────────────────────────────┘
7.3 LOAN DETAIL
┌──────────────────────────────────────────────┐
│ Loan Detail                                  │
├──────────────────────────────────────────────┤
│ Principal: 100,000                           │
│ Remaining: 80,000                            │
│ Interest: 10%                                │
│ Next Due: 12 May                             │
├──────────────────────────────────────────────┤
│ HISTORY                                      │
│ Paid Interest: 10,000                        │
│ Paid Principal: 20,000                       │
└──────────────────────────────────────────────┘
8. ERROR STATES
FAILED SYNC

Transaction could not sync
[ Retry ]
INVALID WITHDRAWAL

Requested exceeds balance
9. PAGE HIERARCHY
AGENT

- Home
- Members
- Add Member
- Transactions
- Transaction Detail
- Sync Queue
- Reconciliation

MEMBER

- Home
- Transactions
- Loan Detail
10. DESIGN ENFORCEMENT RULES
DESIGN MUST:

- show sync state
- show approval state
- separate deposit/savings/withdrawal clearly
- show available withdrawal before withdrawal input
- not hide failed states
- not assume success before approval
11. FINAL MOBILE APP DESIGN INTENT
The app must feel like:

- a field tool (Agent)
- a trust app (Member)
- an offline-safe system

PRIORITIES:

1. speed
2. clarity
3. trust
4. visibility
5. safety

