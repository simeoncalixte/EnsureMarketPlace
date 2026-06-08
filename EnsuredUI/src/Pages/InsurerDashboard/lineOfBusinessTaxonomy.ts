// The line-of-business taxonomy + page-template requests now live in the
// consolidated marketplace API module. This file re-exports them so the many
// existing importers under InsurerDashboard keep their import paths.
export type {
  LineOfBusinessTaxonomySubType,
  LineOfBusinessTaxonomyPrimary,
  LineOfBusinessTaxonomyResponse,
  LineOfBusinessPageTemplateOption,
  LineOfBusinessPageTemplateVisibility,
  LineOfBusinessPageTemplateSectionLayout,
  LineOfBusinessPageTemplateFieldLayout,
  LineOfBusinessPageTemplateField,
  LineOfBusinessPageTemplateSection,
  LineOfBusinessPageTemplate,
  LineOfBusinessPageDataResponse,
  LoadInsuredSubjectPageTemplateResult,
} from '../../api/marketplace';

export {
  loadLineOfBusinessTaxonomy,
  loadLineOfBusinessPageData,
  loadInsuredSubjectPageTemplate,
  saveLineOfBusinessPageTemplate,
  addLineOfBusinessTemplateField,
  removeLineOfBusinessTemplateField,
} from '../../api/marketplace';
