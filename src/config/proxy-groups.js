import { buildSubscriptionGroups } from './subscription-groups.js';

// Both collection types use the same policies; nodes remain dynamically supplied.
export function buildProxyGroups() {
	return buildSubscriptionGroups();
}
