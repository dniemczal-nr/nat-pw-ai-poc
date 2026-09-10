@SSH @SMOKE @BATCH
Feature: Batch service status over SSH

  Background:
    Given I have SSH configuration for the batch host

  Scenario: Batch service is ACTIVE on the configured host
    When I execute "sudo systemctl status $BATCH_SERVICE_NAME" over SSH
    Then the batch service status output should contain "active"
