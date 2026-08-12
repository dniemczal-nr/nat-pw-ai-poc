# Migrated from NAT:
# src/test/resources/features/sanityTests/01_checkLogin.feature
# Canonical PW Test: tests/ui/check-login.spec.ts
# Legacy Cucumber: npx cucumber-js --tags "@legacy-ui and @NetRevealLogin"

@ui @NetReveal @NetRevealSanity @NetRevealLogin @SMOKE @legacy-ui
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
