import { FastifyPluginAsync } from 'fastify';
import { taxonomyRoutes } from './handlers.taxonomy';
import { filtersRoutes } from './handlers.filters';
import { riskClassRoutes } from './handlers.riskClasses';
import { dealRoutes } from './handlers.deals';
import { catScoreRoutes } from './handlers.catScores';

/**
 * Marketplace routes — line-of-business / peril taxonomy, insured-subject and
 * generalized risk-class page-template authoring + schema versioning, the
 * risk-class registry, CAT assessments, benchmark priors, and the
 * deal/opportunity lifecycle.
 * See ./README.md for the concern map. The sub-plugins are registered in the
 * same order the routes were originally declared.
 */
export const marketplaceRoute: FastifyPluginAsync = async (app) => {
  await app.register(filtersRoutes);
  await app.register(catScoreRoutes);
  await app.register(taxonomyRoutes);
  await app.register(riskClassRoutes);
  await app.register(dealRoutes);
};
