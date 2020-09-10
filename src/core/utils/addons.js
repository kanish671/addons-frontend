/* @flow */
import { oneLine } from 'common-tags';
import invariant from 'invariant';

import {
  BADGE_CATEGORIES,
  DOWNLOAD_FAILED,
  ERROR_CORRUPT_FILE,
  FATAL_ERROR,
  FATAL_INSTALL_ERROR,
  FATAL_UNINSTALL_ERROR,
  INSTALL_FAILED,
  SPONSORED,
  VERIFIED,
} from 'core/constants';
import log from 'core/logger';
import { getPreviewImage } from 'core/imageUtils';
import { removeUndefinedProps } from 'core/utils/url';
import type { PromotedCategoryType } from 'core/constants';
import type { SuggestionType } from 'core/reducers/autocomplete';
import type { AddonVersionType } from 'core/reducers/versions';
import type { AddonType, CollectionAddonType } from 'core/types/addons';
import type { I18nType } from 'core/types/i18n';

export const getErrorMessage = ({
  i18n,
  error,
}: {|
  i18n: I18nType,
  error: string | void,
|}): string => {
  invariant(i18n, 'i18n is required');

  switch (error) {
    case ERROR_CORRUPT_FILE:
      return i18n.gettext(
        'Installation aborted because the add-on appears to be corrupt.',
      );
    case INSTALL_FAILED:
      return i18n.gettext('Installation failed. Please try again.');
    case DOWNLOAD_FAILED:
      return i18n.gettext('Download failed. Please check your connection.');
    case FATAL_INSTALL_ERROR:
      return i18n.gettext('An unexpected error occurred during installation.');
    case FATAL_UNINSTALL_ERROR:
      return i18n.gettext(
        'An unexpected error occurred during uninstallation.',
      );
    case FATAL_ERROR:
    default:
      return i18n.gettext('An unexpected error occurred.');
  }
};

export const getFileHash = ({
  addon,
  installURL,
  version,
}: {|
  addon: AddonType,
  installURL: string,
  version: AddonVersionType,
|}): string | void => {
  const urlKey = installURL.split('?')[0];

  for (const platform of Object.keys(version.platformFiles)) {
    // The API sometimes appends ?src= to URLs so we just check the basename.
    const file = version.platformFiles[platform];
    if (file && file.url.startsWith(urlKey)) {
      return file.hash;
    }
  }

  log.warn(oneLine`No file hash found for addon "${addon.slug}", installURL
    "${installURL}" (as "${urlKey}")`);

  return undefined;
};

export const getAddonJsonLinkedData = ({
  addon,
  currentVersion,
  ratingThreshold = 3.3,
}: {|
  addon: AddonType,
  currentVersion: AddonVersionType | null,
  ratingThreshold?: number,
|}): Object => {
  const { ratings } = addon;

  let aggregateRating;
  if (ratings && ratings.count > 0 && ratings.average >= ratingThreshold) {
    aggregateRating = {
      '@type': 'AggregateRating',
      ratingCount: ratings.count,
      ratingValue: ratings.average,
    };
  }

  return removeUndefinedProps({
    '@context': 'http://schema.org',
    '@type': 'WebApplication',
    name: addon.name,
    url: addon.url,
    image: getPreviewImage(addon),
    applicationCategory: 'http://schema.org/OtherApplication',
    operatingSystem: 'Firefox',
    description: addon.summary,
    offers: {
      '@type': 'Offer',
      availability: 'http://schema.org/InStock',
      price: 0,
      priceCurrency: 'USD',
    },
    version: currentVersion ? currentVersion.version : undefined,
    aggregateRating,
  });
};

export const getPromotedCategory = ({
  addon,
  clientApp,
  forBadging = false,
}: {|
  addon: AddonType | CollectionAddonType | SuggestionType | null | void,
  clientApp: string,
  forBadging?: boolean,
|}): PromotedCategoryType | null => {
  let category = null;
  if (addon && addon.promoted && addon.promoted.apps.includes(clientApp)) {
    category = addon.promoted.category;
  }

  // Special logic if we're using the category for badging.
  if (forBadging) {
    // SPONSORED is badged as VERIFIED.
    if (category === SPONSORED) {
      category = VERIFIED;
    }

    // We only have badges for LINE, RECOMMENDED and VERIFIED.
    if (!BADGE_CATEGORIES.includes(category)) {
      category = null;
    }
  }

  return category;
};
