/**
 * @plan specs/uniqa-admin-menu-screens.md §3
 * @seed tests/seed.spec.ts
 */
import { defineMenuSmokeSuite } from './menuTestUtils';
import { BACK_OFFICE_LEAVES } from './menuInventory';

defineMenuSmokeSuite('Menu smoke — Back Office screens', BACK_OFFICE_LEAVES);
