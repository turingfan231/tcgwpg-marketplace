# Analytics Event Map

This app uses `trackEvent(name, payload)` from [src/lib/analytics.js](/Users/deoca/Documents/Playground/src/lib/analytics.js) as the shared analytics entry point.

The current implementation dispatches:

## Browse and search

- `market_scope_opened`
  - `scope`
- `market_filter_applied`
  - `hasFilters`
  - `resultCount`
- `market_filter_saved`
  - `hasFilters`
- `market_filters_cleared`
- `listing_card_opened`
  - `listingId`

## Post listing wizard

- `listing_wizard_search`
  - `game`
  - `hasLanguage`
  - `queryLength`
- `listing_wizard_printing_selected`
  - `cardId`
  - `game`
- `listing_wizard_autosave`
  - `draftId`
  - `step`
- `listing_wizard_draft_saved`
  - `draftId`
- `listing_wizard_published`
  - `game`
  - `listingType`
  - `hasCardRef`

## Messaging and offers

- `message_thread_opened`
  - `threadId`
  - `hasListingContext`
- `message_thread_selected`
  - `threadId`
- `message_sent`
  - `threadId`
  - `hadAttachments`
- `message_send_failed`
  - `threadId`
  - `hadAttachments`
- `message_thread_deleted`
  - `threadId`
- `message_attachment_previewed`
  - `threadId`
- `offer_counter_started`
  - `offerId`
  - `threadId`
- `offer_counter_sent`
  - `offerId`
  - `threadId`
- `offer_accepted`
  - `offerId`
  - `threadId`
- `offer_declined`
  - `offerId`
  - `threadId`

## Recommended next events

- `auth_login_submitted`
- `auth_login_submitted`
  - `hasEmail`
- `auth_signup_submitted`
- `auth_signup_submitted`
  - `neighborhood`
  - `hasPostalCode`
- `auth_password_reset_requested`
- `auth_password_reset_requested`
  - `hasEmail`
- `profile_settings_saved`
- `profile_settings_saved`
  - `defaultListingGame`
  - `favoriteGameCount`
  - `trustedMeetupSpotCount`
  - `hasAvatarUpload`
- `account_delete_requested`
  - `userId`

These are not fully wired yet, but they should be the next layer if we continue the phased rebuild:

- `collection_item_added`
- `collection_item_removed`
- `wishlist_opened_listing`
- `seller_follow_toggled`
- `store_follow_toggled`
- `event_reminder_toggled`
- `event_attendance_changed`

## Data layer notes

- The analytics helper already forwards events to `window.dataLayer` when present.
- It also emits a `tcgwpg:analytics` browser event, which is useful for QA or plugging in a custom analytics adapter later.
- Keep payloads lightweight and avoid raw message bodies, email addresses, or other PII in analytics payloads.
