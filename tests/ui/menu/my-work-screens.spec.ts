/**
 * @plan specs/uniqa-admin-menu-screens.md §1
 * @seed tests/seed.spec.ts
 */
import { defineMenuSmokeSuite } from './menuTestUtils';
import { MY_WORK_LEAVES } from './menuInventory';

defineMenuSmokeSuite('Menu smoke — My Work screens', MY_WORK_LEAVES);
