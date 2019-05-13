import React, { useState } from "react";

export interface ISubscribeTo {
  readonly [key: string]: React.Context<any>;
}

type InferCtxDataType<
  Ctx extends React.Context<any>
> = Ctx extends React.Context<infer CtxData> ? CtxData : never;

export type InferSubscribedData<SubscribeTo extends ISubscribeTo> = {
  readonly [Key in keyof SubscribeTo]: InferCtxDataType<SubscribeTo[Key]>
};

type DataConsumer<SubscribedDataType> = (
  subscribedData: SubscribedDataType,
  // used to pass deepestRender to nested consumer
  render?: DataConsumer<SubscribedDataType>
) => React.ReactElement | null;

function wrapConsumer<SubscribedDataType>(
  innerConsumer: DataConsumer<SubscribedDataType>,
  Ctx: React.Context<{}>,
  ctxName: string
) {
  if (!Ctx || !Ctx.Consumer) {
    return innerConsumer;
  }
  return (
    collectedContext: SubscribedDataType,
    deepestRender?: DataConsumer<SubscribedDataType>
  ) => (
    <Ctx.Consumer>
      {context =>
        /**
         * don't put side effect(e.g. mutate collectedContext) in render phase,
         * otherwise it is not safe in react async mode:
         * https://github.com/facebook/react/issues/12397#issuecomment-375500790
         * instead, we create a new collectedContext object every time
         */
        innerConsumer(
          {
            ...collectedContext,
            [ctxName]: context
          },
          deepestRender
        )
      }
    </Ctx.Consumer>
  );
}

export function createCtxSubscriber<SubscribeTo extends ISubscribeTo>(
  subscribeTo: SubscribeTo
) {
  type SubscribedData = InferSubscribedData<SubscribeTo>;

  const composedConsumer = Object.keys(subscribeTo).reduce(
    (innerConsumer: DataConsumer<SubscribedData>, ctxName: string) =>
      wrapConsumer(innerConsumer, subscribeTo[ctxName], ctxName),
    // the innermost consumer:
    // it take collectedContext and call props.children
    (
      collectedContext: SubscribedData,
      deepestRender?: DataConsumer<SubscribedData>
    ) => (deepestRender ? deepestRender(collectedContext) : null)
  );

  const CtxSubscriber: React.FC<{
    children: (
      subscribedData: SubscribedData
    ) => React.ReactElement | null;
  }> = props => {
    /**
     * make nested Consumers using recursion:
     * https://github.com/pgarciacamou/react-context-consumer-hoc
     */
    return composedConsumer(
      // inial collectedContext
      ({} as unknown) as SubscribedData,
      // props.children is the deepestRender
      props.children
    );
  };
  return CtxSubscriber;
}
