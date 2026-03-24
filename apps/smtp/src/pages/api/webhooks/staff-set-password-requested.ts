import { NextJsWebhookHandler, SaleorAsyncWebhook } from "@saleor/app-sdk/handlers/next";
import { wrapWithLoggerContext } from "@saleor/apps-logger/node";
import { ObservabilityAttributes } from "@saleor/apps-otel/src/observability-attributes";
import { withSpanAttributes } from "@saleor/apps-otel/src/with-span-attributes";
import { captureException } from "@sentry/nextjs";
import { StaffSetPasswordRequestedWebhookPayloadFragment } from "generated/graphql";
import { gql } from "urql";

import { createLogger } from "../../../logger";
import { loggerContext } from "../../../logger-context";
import { SendEventMessagesUseCase } from "../../../modules/event-handlers/use-case/send-event-messages.use-case";
import { SendEventMessagesUseCaseFactory } from "../../../modules/event-handlers/use-case/send-event-messages.use-case.factory";
import { saleorApp } from "../../../saleor-app";

const StaffSetPasswordRequestedWebhookPayload = gql`
  fragment StaffSetPasswordRequestedWebhookPayload on StaffSetPasswordRequested {
    user {
      email
      firstName
      lastName
    }
    token
    redirectUrl
    shop {
      name
      domain {
        host
        url
      }
    }
    channel {
      slug
    }
  }
`;

const StaffSetPasswordRequestedGraphqlSubscription = gql`
  ${StaffSetPasswordRequestedWebhookPayload}
  subscription StaffSetPasswordRequested {
    event {
      ...StaffSetPasswordRequestedWebhookPayload
    }
  }
`;

const staffSetPasswordRequestedEventName = "STAFF_SET_PASSWORD_REQUESTED";

export const staffSetPasswordRequstedWebhook =
  new SaleorAsyncWebhook<StaffSetPasswordRequestedWebhookPayloadFragment>({
    name: "Staff set password requested",
    webhookPath: "api/webhooks/staff-set-password-requested",
    event: staffSetPasswordRequestedEventName,
    apl: saleorApp.apl,
    query: StaffSetPasswordRequestedGraphqlSubscription,
  });

const logger = createLogger(staffSetPasswordRequstedWebhook.webhookPath);

const useCaseFactory = new SendEventMessagesUseCaseFactory();

const handler: NextJsWebhookHandler<StaffSetPasswordRequestedWebhookPayloadFragment> = async (
  req,
  res,
  context,
) => {
  logger.info("Webhook received");

  const { payload, authData } = context;
  const { user, channel } = payload;

  if (!user) {
    logger.error("No user data payload");

    return res.status(200).end();
  }

  const recipientEmail = user.email;

  if (!recipientEmail?.length) {
    logger.error(
      `The user ${user.firstName} ${user.lastName} had no email recipient set. Aborting.`,
    );

    return res
      .status(200)
      .json({ error: "Email recipient has not been specified in the event payload." });
  }

  const channelSlug = channel?.slug ?? undefined;

  const useCase = useCaseFactory.createFromAuthData(authData);

  try {
    return useCase
      .sendEventMessages({
        channelSlug: channelSlug,
        event: staffSetPasswordRequestedEventName,
        payload: {
          user,
          redirectUrl: payload.redirectUrl,
          token: payload.token,
          shop: payload.shop,
        },
        recipientEmail,
      })
      .then((result) =>
        result.match(
          (r) => {
            logger.info("Successfully sent email(s)");

            return res.status(200).json({ message: "The event has been handled" });
          },
          (err) => {
            const errorInstance = err[0];

            if (errorInstance instanceof SendEventMessagesUseCase.ServerError) {
              logger.warn("Failed to send email(s) [server error]", { error: err });

              return res.status(500).json({ message: "Failed to send email" });
            } else if (errorInstance instanceof SendEventMessagesUseCase.ClientError) {
              logger.info("Failed to send email(s) [client error]", { error: err });

              return res.status(400).json({ message: "Failed to send email" });
            } else if (errorInstance instanceof SendEventMessagesUseCase.NoOpError) {
              logger.info("Sending emails aborted [no op]", { error: err });

              return res.status(200).json({ message: "The event has been handled [no op]" });
            }

            logger.error("Failed to send email(s) [unhandled error]", { error: err });
            captureException(new Error("Unhandled useCase error", { cause: err }));

            return res.status(500).json({ message: "Failed to send email [unhandled]" });
          },
        ),
      );
  } catch (e) {
    logger.error("Unhandled error from useCase", {
      error: e,
    });

    captureException(e);

    return res.status(500).json({ message: "Failed to execute webhook" });
  }
};

export default wrapWithLoggerContext(
  withSpanAttributes(staffSetPasswordRequstedWebhook.createHandler(handler)),
  loggerContext,
);

export const config = {
  api: {
    bodyParser: false,
  },
};
