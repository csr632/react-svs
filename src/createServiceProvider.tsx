/* tslint:disable:max-classes-per-file max-line-length */
import React from "react";

import {
  ISubscribeTo,
  InferSubscribedData,
  createCtxSubscriber
} from "./createCtxSubscriber";
import { Omit } from "./utils";

interface IServiceConstructorBasic<
  State,
  SubscribeTo extends ISubscribeTo,
  ProviderPropsType extends Omit<{ [key: string]: any }, "subscribedData">
> {
  readonly initialState: State;
  readonly subscribeTo: SubscribeTo;
  readonly defaultProviderProps: ProviderPropsType;
  onProviderGetDerivedStateFromProps(
    props: Readonly<
      {
        subscribedData: InferSubscribedData<SubscribeTo>;
      } & ProviderPropsType
    >,
    state: State
  ): Partial<State> | null;
}
interface IServiceConstructor<
  State,
  SubscribeTo extends ISubscribeTo,
  ProviderPropsType extends Omit<{ [key: string]: any }, "subscribedData">
> extends IServiceConstructorBasic<State, SubscribeTo, ProviderPropsType> {
  new (
    providerInstance: React.Component<
      { subscribedData: InferSubscribedData<SubscribeTo> } & ProviderPropsType,
      State
    >
  ): IServiceInstance<State>;
}
// tslint:disable-next-line:class-name
interface IServiceConstructor_LOOSE_CTOR<
  State,
  SubscribeTo extends ISubscribeTo,
  ProviderPropsType extends Omit<{ [key: string]: any }, "subscribedData">
> extends IServiceConstructorBasic<State, SubscribeTo, ProviderPropsType> {
  /**
   * A mixin constructor type must has a single construct signature
   * with a single rest argument of type any[] and an object-like return type.
   * So we create this variant of IServiceConstructor.
   * https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#first-some-terminology
   */
  new (...args: any[]): IServiceInstance<State>;
}

interface IServiceInstance<State> {
  // setState will be injected into the service by Provider
  readonly setProviderState: React.Component<{}, State>["setState"];
  // hooks
  onProviderConstructing(): Partial<State> | null;
  onProviderDidMount(): void;
  onProviderDidUpdate(): void;
  onProviderWillUnmount(): void;
}

type InferState<
  ServiceConstructor extends IServiceConstructor_LOOSE_CTOR<{}, {}, {}>
> = ServiceConstructor extends IServiceConstructor_LOOSE_CTOR<
  infer State,
  {},
  {}
>
  ? State
  : never;

type InferSubscribeTo<
  ServiceConstructor extends IServiceConstructor_LOOSE_CTOR<{}, {}, {}>
> = ServiceConstructor extends IServiceConstructor_LOOSE_CTOR<
  {},
  infer SubscribeTo,
  {}
>
  ? SubscribeTo
  : never;

type InferProviderPropsType<
  ServiceConstructor extends IServiceConstructor_LOOSE_CTOR<{}, {}, {}>
> = ServiceConstructor extends IServiceConstructor_LOOSE_CTOR<
  {},
  {},
  infer ProviderPropsType
>
  ? ProviderPropsType
  : never;

/**
 * @description
 * Provider is designed to be a `Component` that:
 *  1. allow its descendants to subscribe it's state's change
 *      (descendants subscribe to StateCtx to get state)
 *  2. provide service(which have convenient/reusable routines)
 *      for its descendants to update it's state
 *      (descendants use ServiceCtx to get the service
 *      and call it's methods)
 *  3. call service's lifecycles(that mirror normal component's lifecycles)
 *      that let programers do something when Provider lifecycles happens
 *      (e.g. when Provider is mounted or updated)
 *      (programers implement the hooks when definding the Service class)
 *
 * Service is designed to be a `Object` that:
 *  1. can call the Provider's setState() to update it's state
 *  2. provide a group of convenient/reusable routines
 *      to make async request, process data, and update Provider's state
 *  3. have access to Provider's props and state
 *      But they are **protected member**, which means
 *      provider's descendants components can't (and shouldn't)
 *      read state and props directly from service. They should do this
 *      by subscribe to StateCtx, not ServiceCtx
 *
 * Provider and Service are one-to-one: One Provider component instance
 * provide one Service instance using ServiceCtx.
 *
 * To use this, you have to define a Service class
 * (which contains data fetching/processing logic), and use
 * `crerateServiceProvider` to automatically generate a Provider
 * for it(and the ServiceCtx/StateCtx to obtain service/state).
 * Then, put the Provider component somewhere in the React component tree.
 * Now, you can obtain the service or state
 * in any component under the Provider!(using ServiceCtx/StateCtx)
 *
 */
function crerateServiceProvider<
  ServiceConstructor extends IServiceConstructor<{}, {}, {}>
>(ArgServiceCtor: ServiceConstructor) {
  // infer type info from ArgServiceCtor,
  // and then load the type info back into itself
  // (need to rename the type-loaded variable into `ServiceCtor`)
  type State = InferState<ServiceConstructor>;
  type SubscribeTo = InferSubscribeTo<ServiceConstructor>;
  type ProviderPropsType = InferProviderPropsType<ServiceConstructor>;
  type SubscribedData = InferSubscribedData<SubscribeTo>;

  const ServiceCtor: IServiceConstructor<
    State,
    SubscribeTo,
    ProviderPropsType
  > = ArgServiceCtor as any;

  const ServiceCtx = React.createContext<InstanceType<ServiceConstructor>>(
    null as any
  );
  const StateCtx = React.createContext<Readonly<State>>(null as any);

  const CtxSubscriber = createCtxSubscriber(ServiceCtor.subscribeTo);

  type RawProviderProps = {
    subscribedData: SubscribedData;
  } & ProviderPropsType;

  const RawProvider: React.ComponentClass<
    RawProviderProps,
    State
  > = class extends React.Component<RawProviderProps, State> {
    private serviceInstance: InstanceType<ServiceConstructor>;

    constructor(props: RawProviderProps) {
      super(props);
      this.serviceInstance = new ServiceCtor(
        // inject provider instance into the service instance
        this
      ) as InstanceType<ServiceConstructor>;
      const statePatch = this.serviceInstance.onProviderConstructing();
      // init provider state
      this.state = { ...ServiceCtor.initialState, ...statePatch };
    }

    public static getDerivedStateFromProps(
      props: Readonly<RawProviderProps>,
      state: State
    ) {
      return ServiceCtor.onProviderGetDerivedStateFromProps(props, state);
    }

    public componentDidMount() {
      this.serviceInstance.onProviderDidMount();
    }

    public componentDidUpdate() {
      this.serviceInstance.onProviderDidUpdate();
    }

    public componentWillUnmount() {
      this.serviceInstance.onProviderWillUnmount();
    }

    public render() {
      return (
        <ServiceCtx.Provider value={this.serviceInstance}>
          <StateCtx.Provider value={this.state}>
            {this.props.children}
          </StateCtx.Provider>
        </ServiceCtx.Provider>
      );
    }
  };
  const WrappedProvider: React.FC<ProviderPropsType> = props => (
    <CtxSubscriber>
      {subscribedData => {
        return (
          <RawProvider
            {...ServiceCtor.defaultProviderProps}
            {...props}
            subscribedData={subscribedData}
          />
        );
      }}
    </CtxSubscriber>
  );

  return { Provider: WrappedProvider, ServiceCtx, StateCtx };
}

/**
 * @description
 * we use mixin to add static property into the input class:
 * https://stackoverflow.com/a/54813533/8175856
 *
 * currently, decorator can't mutate the type of target class
 * so we have to use it as a normal function(mixin):
 * https://github.com/Microsoft/TypeScript/issues/4881
 */
export function ServiceMixin<
  ServiceConstructor extends IServiceConstructor_LOOSE_CTOR<{}, {}, {}>
>(ServiceConstructor: ServiceConstructor) {
  const { Provider, ServiceCtx, StateCtx } = crerateServiceProvider(
    ServiceConstructor
  );

  const withProvider = <Props extends {}>(
    Comp: React.ComponentType<Props>,
    providerProps: InferProviderPropsType<ServiceConstructor>
  ) => {
    const HOC: React.FC<Props> = props => (
      <Provider {...providerProps}>
        <Comp {...props} />
      </Provider>
    );
    return HOC;
  };

  return class extends ServiceConstructor {
    public static readonly Provider = Provider;
    public static readonly ServiceCtx = ServiceCtx;
    public static readonly StateCtx = StateCtx;
    public static readonly withProvider = withProvider;
  };
}

/**
 * @description
 * use ServiceBase to get a well-typed base class,
 * so that when Service class extends it,
 * we can get nice code-complete and type-checking.
 *
 * for example, type of setProviderState and subscribedData will be ready
 * when a derived class extends it.
 */
export function ServiceBase<
  State,
  SubscribeTo extends ISubscribeTo,
  ProviderPropsType extends Omit<{ [key: string]: any }, "subscribedData">
>(
  initialState: State,
  subscribeTo: SubscribeTo = {} as SubscribeTo,
  defaultProviderProps: ProviderPropsType = {} as ProviderPropsType
) {
  type SubscribedData = InferSubscribedData<SubscribeTo>;
  type RawProviderProps = {
    subscribedData: SubscribedData;
  } & ProviderPropsType;

  class Base implements IServiceInstance<State> {
    public static readonly initialState = initialState;
    public static readonly subscribeTo = subscribeTo;
    public static readonly defaultProviderProps = defaultProviderProps;
    // private/protected fields, preventing abuse
    private providerInstance: React.Component<RawProviderProps, State>;
    protected get providerState(): Readonly<State> {
      return this.providerInstance.state;
    }
    protected get providerProps() {
      return this.providerInstance.props;
    }
    protected get subscribedData(): SubscribedData {
      return this.providerInstance.props.subscribedData;
    }
    public readonly setProviderState: React.Component<{}, State>["setState"];
    // lifecycles
    public onProviderConstructing(): Partial<State> | null {
      /** dummy. overrided by subclass */
      return null;
    }
    public static onProviderGetDerivedStateFromProps(
      props: Readonly<RawProviderProps>,
      state: State
    ): Partial<State> | null {
      /** dummy. overrided by subclass */
      return null;
    }
    public onProviderDidMount() {
      /** dummy. overrided by subclass */
    }
    public onProviderDidUpdate() {
      /** dummy. overrided by subclass */
    }
    public onProviderWillUnmount() {
      /** dummy. overrided by subclass */
    }

    constructor(providerInstance: React.Component<RawProviderProps, State>) {
      this.setProviderState = providerInstance.setState.bind(providerInstance);
      this.providerInstance = providerInstance;
    }
  }
  /**
   * make sure:
   * 1. Base's `instance side` extends IServiceInstance<State, SubscribeTo>
   *    we do this by `Base implements IServiceInstance<State, SubscribeTo>`
   * 2. Base's `static side` extends IServiceConstructor<State, SubscribeTo>
   *    we do this by `TypeCheck<typeof Base>`
   *      if TypeCheck fail, ts will report type error
   *
   * see: https://www.typescriptlang.org/docs/handbook/interfaces.html#difference-between-the-static-and-instance-sides-of-classes
   */

  type TypeCheck<
    Checked extends IServiceConstructor<State, SubscribeTo, ProviderPropsType>
  > = Checked;
  // first check the Base class do fit IServiceConstructor
  // then do the type conversion
  return (Base as TypeCheck<typeof Base>) as IServiceConstructor<
    State,
    SubscribeTo,
    ProviderPropsType
  >;
}
