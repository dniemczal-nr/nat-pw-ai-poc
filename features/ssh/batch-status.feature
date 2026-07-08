@SSH @SMOKE @BATCH
Feature: Batch service status over SSH

  Background:
    Given I have SSH configuration for the batch QA host

  Scenario: Batch service is ACTIVE on batch.qa2.reyl.fs.caws.local
    When I execute "sudo systemctl status $BATCH_SERVICE_NAME" over SSH
    Then the batch service status output should contain "active"
