/**
 * @plan specs/uniqa-admin-menu-screens.md §6
 * @seed tests/seed.spec.ts
 *
 * Reload Configuration under Services Manager / Command And Control is skipped
 * (app hang / destructive) per plan.
 */
import { defineMenuSmokeSuite } from './menuTestUtils';
import { BUILDERS_AND_MANAGERS_LEAVES } from './menuInventory';

defineMenuSmokeSuite('Menu smoke — Builders and managers screens', BUILDERS_AND_MANAGERS_LEAVES);
