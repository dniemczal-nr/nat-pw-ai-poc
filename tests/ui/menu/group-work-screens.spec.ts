/**
 * @plan specs/uniqa-admin-menu-screens.md §2
 * @seed tests/seed.spec.ts
 */
import { defineMenuSmokeSuite } from './menuTestUtils';
import { GROUP_WORK_LEAVES } from './menuInventory';

defineMenuSmokeSuite('Menu smoke — Group Work screens', GROUP_WORK_LEAVES);
