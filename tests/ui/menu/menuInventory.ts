/**
 * UNIQA QA menu inventory for smoke navigation.
 * `leafId` is the live DOM `li` id of the leaf item (unique even when labels repeat).
 * Skip entries marked `skip` (destructive / hangs).
 */

export type MenuLeaf = {
  /** Leaf `li` id containing the navigable link */
  leafId: string;
  /** Exact link accessible name (for assertion / readability) */
  linkName: string;
  /** Optional reason — when set, test is skipped */
  skip?: string;
};

export const MY_WORK_LEAVES: MenuLeaf[] = [
  { leafId: 'menu-item_my_work_path_menu-item_home_path', linkName: 'Home' },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_alerts_path_menu-item_my_activealerts_path',
    linkName: 'My Active Alerts',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_alerts_path_menu-item_create_alert_path',
    linkName: 'Create Alert',
  },
  { leafId: 'menu-item_my_work_path_menu-item_get_next_alert_path', linkName: 'Get Next Alert' },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_cases_path_menu-item_my_active_cases_path',
    linkName: 'My Active Cases',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_cases_path_menu-item_create_case_path',
    linkName: 'Create Case',
  },
  {
    leafId:
      'menu-item_my_work_path_menu-item_my_minor_groups_path_menu-item_my_minor_groups_path',
    linkName: 'My Minor Groups',
  },
  {
    leafId:
      'menu-item_my_work_path_menu-item_my_minor_groups_path_menu-item_create_minor_group_path',
    linkName: 'Create Minor Group',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_tasks_path_menu-item_daily_view_path',
    linkName: 'Daily View',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_tasks_path_menu-item_weekly_view_path',
    linkName: 'Weekly View',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_tasks_path_menu-item_overdue_path',
    linkName: 'Overdue',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_daily_view_path',
    linkName: 'Daily View',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_weekly_view_path',
    linkName: 'Weekly View',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_delegated_tasks_path_menu-item_overdue_path',
    linkName: 'Overdue',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_notifications_path_menu-item_inbox_path',
    linkName: 'Inbox',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_notifications_path_menu-item_sent_items_path',
    linkName: 'Sent Items',
  },
  {
    leafId: 'menu-item_my_work_path_menu-item_my_notifications_path_menu-item_deleted_items_path',
    linkName: 'Deleted Items',
  },
];

export const GROUP_WORK_LEAVES: MenuLeaf[] = [
  { leafId: 'menu-item_group_work_path_menu-item_all_alerts_path', linkName: 'All Alerts' },
  {
    leafId: 'menu-item_group_work_path_menu-item_hibernated_alerts_path',
    linkName: 'Hibernated Alerts',
  },
  {
    leafId: 'menu-item_group_work_path_menu-item_alerting_subjects_path',
    linkName: 'Alerting Subjects',
  },
  { leafId: 'menu-item_group_work_path_menu-item_all_cases_path', linkName: 'All Cases' },
  {
    leafId: 'menu-item_group_work_path_menu-item_all_minor_groups_path',
    linkName: 'All Minor Groups',
  },
  {
    leafId: 'menu-item_group_work_path_menu-item_all_e-files_path',
    linkName: 'All E-Files',
    skip: 'All E-Files is not present in the UNIQA QA menu for this admin user',
  },
];

export const BACK_OFFICE_LEAVES: MenuLeaf[] = [
  {
    leafId: 'menu-item_back_office_path_menu-item_subjects_path_menu-item_customers_path',
    linkName: 'Customers',
  },
  {
    leafId: 'menu-item_back_office_path_menu-item_subjects_path_menu-item_associated_parties_path',
    linkName: 'Associated Parties',
  },
  {
    leafId: 'menu-item_back_office_path_menu-item_subjects_path_menu-item_counterparties_path',
    linkName: 'Counterparties',
  },
  { leafId: 'menu-item_back_office_path_menu-item_policies_path', linkName: 'Policies' },
];

export const DASHBOARD_LEAVES: MenuLeaf[] = [
  {
    leafId: 'menu-item_dashboards_path_menu-item_customer_risk_dashboard_path',
    linkName: 'Customer Risk Dashboard',
  },
  {
    leafId: 'menu-item_dashboards_path_menu-item_alerts_dashboard_path',
    linkName: 'Alerts Dashboard',
  },
  {
    leafId: 'menu-item_dashboards_path_menu-item_cases_dashboard_path',
    linkName: 'Cases Dashboard',
  },
  { leafId: 'menu-item_dashboards_path_menu-item_ml_dashboard_path', linkName: 'ML Dashboard' },
  {
    leafId: 'menu-item_dashboards_path_menu-item_detection_dashboard_path',
    linkName: 'Detection Dashboard',
  },
];

/** Representative Administration leaves (read-only smoke). */
export const ADMINISTRATION_LEAVES: MenuLeaf[] = [
  {
    leafId: 'home_administration_home_administration_authentication_base_userlist_caption',
    linkName: 'Users',
  },
  {
    leafId: 'home_administration_home_administration_authentication_base_grouplist_caption',
    linkName: 'Groups',
  },
  {
    leafId: 'home_administration_home_administration_authorisation_base_rolelist_caption',
    linkName: 'Roles',
  },
  {
    leafId: 'home_administration_home_administration_authorisation_base_domainlist_caption',
    linkName: 'Domains',
  },
  {
    leafId: 'home_administration_home_administration_authorisation_base_orgunitlist_caption',
    linkName: 'Organizational Units',
  },
  {
    leafId: 'home_administration_home_administration_auditing_base_auditlogsearch_caption',
    linkName: 'Audit Log Search',
  },
  {
    leafId: 'home_administration_home_administration_configmanagement_base_menueditor_caption',
    linkName: 'Menu Editor',
  },
];

export const BUILDERS_AND_MANAGERS_LEAVES: MenuLeaf[] = [
  {
    leafId:
      'configurator_admin_applications_applicationbuilder_configurator_admin_applications_applicationbuilder_viewall',
    linkName: 'View All Applications',
  },
  {
    leafId:
      'configurator_admin_applications_applicationbuilder_configurator_admin_applications_applicationbuilder_create',
    linkName: 'New Application',
  },
  {
    leafId: 'home_workflowconfigurator_home_workflowconfigurator_selectworkflow',
    linkName: 'Workflows',
  },
  {
    leafId: 'home_scenariomanager_scenariomanager_scenariomanager_dux',
    linkName: 'Scenario Manager',
  },
  { leafId: 'home_services_services_configuration', linkName: 'Services Configuration' },
  { leafId: 'home_services_services_configuration_export', linkName: 'Export Configuration' },
  {
    leafId: 'home_services_services_configuration_reload',
    linkName: 'Reload Configuration',
    skip: 'Services Manager → Reload Configuration hangs the app on UNIQA QA',
  },
  { leafId: 'home_services_send_test_message', linkName: 'Send Test Message' },
  { leafId: 'home_services_error_log', linkName: 'Error Log' },
  {
    leafId: 'home_command_and_control_home_command_and_control_configuration',
    linkName: 'Configuration',
  },
  {
    leafId: 'home_command_and_control_home_command_and_control_configuration_reload',
    linkName: 'Reload Configuration',
    skip: 'Command And Control → Reload Configuration is destructive / unstable',
  },
  {
    leafId: 'home_command_and_control_home_command_and_control_report_builder',
    linkName: 'Report Builder',
  },
  {
    leafId:
      'menu-item_compliance_simulation_path_menu-item_cdd_simulation_path_menu-item_risk_model_simulation_path',
    linkName: 'Risk Model Simulation',
  },
];
