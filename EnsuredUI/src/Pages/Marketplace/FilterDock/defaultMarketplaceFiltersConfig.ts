import type { FiltersConfig } from './FilterRenderer';

export const DEFAULT_MARKETPLACE_FILTERS_CONFIG: FiltersConfig = {
  version: '1.1',
  targeting: { scope: 'global' },
  sections: [
    {
      id: 'exposure',
      title: 'Exposure',
      defaultOpen: true,
      fields: [
        {
          id: 'lob',
          type: 'multiselect',
          label: 'Line of business',
          optionsSource: 'primaryTypes',
          optionsUrl: '/api/marketplace/filters/options/lob',
          uiProps: {
            placeholder: 'Any line of business',
            searchPlaceholder: 'Search line of business...',
          },
        },
        {
          id: 'sub',
          type: 'multiselect',
          label: 'Sub-types',
          optionsSource: 'subTypes',
          optionsUrl: '/api/marketplace/filters/options/sub?lob={lob}',
          dependsOn: ['lob'],
          uiProps: {
            placeholder: 'Any sub type',
            searchPlaceholder: 'Search sub types...',
          },
        },
        {
          id: 'peril',
          type: 'multiselect',
          label: 'Peril',
          optionsSource: 'perils',
          optionsUrl: '/api/marketplace/filters/options/peril',
          uiProps: {
            placeholder: 'Any peril',
            searchPlaceholder: 'Search perils...',
          },
        },
        {
          id: 'geography',
          type: 'autocomplete_multi',
          label: 'Geography',
          uiProps: {
            placeholder: 'Type a place and press Enter',
          },
        },
        { id: 'tiv', type: 'minmax', label: 'TIV ($ range)' },
        { id: 'capacity', type: 'minmax', label: 'Capacity' },
        { id: 'limit', type: 'minmax', label: 'Limit' },
        { id: 'attachment', type: 'minmax', label: 'Attachment' },
      ],
    },
    {
      id: 'financial',
      title: 'Financial',
      fields: [
        { id: 'premium', type: 'disabled_minmax', label: 'Premium ($ range)' },
        { id: 'yield', type: 'minmax', label: 'Yield (%)' },
        { id: 'expectedRoi', type: 'disabled_minmax', label: 'Expected ROI (%)' },
        { id: 'brokerage', type: 'disabled_minmax', label: 'Brokerage (%)' },
        { id: 'lossRatio', type: 'disabled_minmax', label: 'Loss ratio (%)' },
      ],
    },
    {
      id: 'risk',
      title: 'Risk',
      // CAT filters are backed by CAT assessment score records (not the generic
      // peril taxonomy filter). `catScore` is min/max and is translated to
      // opportunities query params (`catScoreMin` / `catScoreMax`) by page logic.
      fields: [
        {
          id: 'catPeril',
          type: 'multiselect',
          label: 'CAT peril',
          optionsSource: 'catPerils',
          optionsUrl: '/api/marketplace/filters/options/catPeril',
          uiProps: {
            placeholder: 'Any CAT peril',
            searchPlaceholder: 'Search CAT perils...',
          },
        },
        { id: 'catScore', type: 'minmax', label: 'CAT score' },
        {
          id: 'catBand',
          type: 'multiselect',
          label: 'CAT band',
          optionsSource: 'catBands',
          optionsUrl: '/api/marketplace/filters/options/catBand',
          uiProps: {
            placeholder: 'Any CAT band',
            searchPlaceholder: 'Search CAT bands...',
          },
        },
        {
          id: 'catModelVersion',
          type: 'multiselect',
          label: 'CAT model version',
          optionsSource: 'catModelVersions',
          optionsUrl: '/api/marketplace/filters/options/catModelVersion',
          uiProps: {
            placeholder: 'Any model version',
            searchPlaceholder: 'Search model versions...',
          },
        },
        {
          id: 'catRecommendedAction',
          type: 'multiselect',
          label: 'CAT underwriting action',
          optionsSource: 'catRecommendedActions',
          optionsUrl: '/api/marketplace/filters/options/catRecommendedAction',
          uiProps: {
            placeholder: 'Any action',
            searchPlaceholder: 'Search actions...',
          },
        },
      ],
    },
    {
      id: 'market',
      title: 'Market',
      fields: [
        {
          id: 'broker',
          type: 'multiselect',
          label: 'Broker',
          optionsSource: 'brokers',
          optionsUrl: '/api/marketplace/filters/options/broker',
          uiProps: {
            placeholder: 'Any broker',
            searchPlaceholder: 'Search brokers...',
          },
        },
        {
          id: 'carrier',
          type: 'multiselect',
          label: 'Carrier',
          optionsSource: 'carriers',
          optionsUrl: '/api/marketplace/filters/options/carrier',
          uiProps: {
            placeholder: 'Any carrier',
            searchPlaceholder: 'Search carriers...',
          },
        },
        {
          id: 'submissionStatus',
          type: 'multiselect',
          label: 'Submission status',
          optionsSource: 'submissionStatuses',
          optionsUrl: '/api/marketplace/filters/options/submissionStatus',
          uiProps: {
            placeholder: 'Any status',
            searchPlaceholder: 'Search statuses...',
          },
        },
        { id: 'submissionType', type: 'custom', slotKey: 'submissionTypeTree' },
        { id: 'marketAppetite', type: 'disabled_select', label: 'Market appetite' },
      ],
    },
    {
      id: 'time',
      title: 'Time',
      fields: [
        {
          id: 'maxDurationMonths',
          type: 'range',
          label: 'Max term',
          uiProps: {
            min: 3,
            max: 36,
            step: 1,
            defaultValue: 36,
            showAnyAtMax: true,
            labels: ['3M', '12M', '24M', '36M'],
          },
        },
      ],
    },
  ],
};
