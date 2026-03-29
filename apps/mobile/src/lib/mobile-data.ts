import {
  demoAgentDashboard,
  demoAgentTransactions,
  demoAssignedMembers,
  demoLoans,
  demoMemberDashboard,
  demoMemberProfile,
  demoMemberTransactions,
  demoSyncQueue,
} from "@/mocks/mobile-data";

const DEMO_DELAY_MS = 180;

function clone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

function withDelay<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(clone(data)), DEMO_DELAY_MS);
  });
}

export const mobileData = {
  getAgentDashboard: () => withDelay(demoAgentDashboard),
  getAssignedMembers: () => withDelay(demoAssignedMembers),
  getAgentTransactions: () => withDelay(demoAgentTransactions),
  getSyncQueue: () => withDelay(demoSyncQueue),
  getMemberDashboard: () => withDelay(demoMemberDashboard),
  getMemberTransactions: () => withDelay(demoMemberTransactions),
  getLoans: () => withDelay(demoLoans),
  getMemberProfile: () => withDelay(demoMemberProfile),
};
