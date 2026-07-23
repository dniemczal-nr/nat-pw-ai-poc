# Migrated from NAT:
# src/test/resources/features/sanityTests/01_checkLogin.feature
# Run: npx cucumber-js --tags "@NetRevealLogin"

@ui @NetReveal @NetRevealSanity @NetRevealLogin @SMOKE
Feature: NetReveal login permission procedure tests per user

  Background:
    Given I open NetReveal Environment

  Scenario Outline: NetReveal login and logout test for user: "<user>"
    When I log into NetReveal as "<user>"
    Then I assert that Home header is available
    When I am logging out
    Then I assert that I am on the NetReveal LoginPage

    @OOTB_Sanity
    Examples:
      | user  |
      | admin |
