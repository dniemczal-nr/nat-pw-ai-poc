/**
 * @plan specs/uniqa-admin-menu-screens.md §5
 * @seed tests/seed.spec.ts
 */
import { defineMenuSmokeSuite } from './menuTestUtils';
import { ADMINISTRATION_LEAVES } from './menuInventory';

defineMenuSmokeSuite('Menu smoke — Administration screens', ADMINISTRATION_LEAVES);
