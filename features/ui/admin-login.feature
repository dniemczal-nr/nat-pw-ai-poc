@ui @phase3
Feature: Admin UI login
  As an authenticated admin user
  I want to log into the admin UI
  So that I can access the shell header

  Scenario: Admin can log in successfully
    Given I am on the login page
    When I log in as an "admin" admin user with password "password"
    Then I should see the admin shell header
