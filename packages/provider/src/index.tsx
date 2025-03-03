import type { Theme } from '@ant-design/cssinjs';
import { useCacheToken } from '@ant-design/cssinjs';
import { ConfigProvider as AntdConfigProvider } from 'antd';

import zh_CN from 'antd/lib/locale/zh_CN';
import React, { useContext, useEffect, useMemo } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import type { IntlType } from './intl';
import { findIntlKeyByAntdLocaleKey } from './intl';
import { intlMap, zhCNIntl } from './intl';

import type { DeepPartial, ProTokenType } from './typing/layoutToken';
import { getLayoutDesignToken } from './typing/layoutToken';
import type { ProAliasToken } from './useStyle';
import { proTheme } from './useStyle';
import { emptyTheme, defaultToken } from './useStyle/token';
import { merge } from './utils/merge';

export * from './useStyle';
export * from './intl';

export { DeepPartial, ProTokenType };

/**
 * 用于配置 ValueEnum 的通用配置
 */
export type ProSchemaValueEnumType = {
  /** @name 演示的文案 */
  text: React.ReactNode;

  /** @name 预定的颜色 */
  status?: string;
  /** @name 自定义的颜色 */
  color?: string;
  /** @name 是否禁用 */
  disabled?: boolean;
};

/**
 * 支持 Map 和 Object
 *
 * @name ValueEnum 的类型
 */
type ProSchemaValueEnumMap = Map<string | number, ProSchemaValueEnumType | React.ReactNode>;

/**
 * 支持 Map 和 Object
 */
type ProSchemaValueEnumObj = Record<string, ProSchemaValueEnumType | React.ReactNode>;

/**
 * BaseProFieldFC 的类型设置
 */
export type BaseProFieldFC = {
  /** 值的类型 */
  text: React.ReactNode;
  /** 放置到组件上 props */
  fieldProps?: any;
  /**
   * 组件的渲染模式类型
   * @option read 渲染只读模式
   * @option edit 渲染编辑模式
   * */
  mode: ProFieldFCMode;
  /**
   * 简约模式
   */
  plain?: boolean;
  /** 轻量模式 */
  light?: boolean;
  /** Label */
  label?: React.ReactNode;
  /** 映射值的类型 */
  valueEnum?: ProSchemaValueEnumObj | ProSchemaValueEnumMap;
  /** 唯一的key，用于网络请求 */
  proFieldKey?: React.Key;
};

export type ProFieldFCMode = 'read' | 'edit' | 'update';

/** Render 第二个参数，里面包含了一些常用的参数 */
export type ProFieldFCRenderProps = {
  mode?: ProFieldFCMode;
  readonly?: boolean;
  placeholder?: string | string[];
  value?: any;
  onChange?: (...rest: any[]) => void;
} & BaseProFieldFC;

export type ProRenderFieldPropsType = {
  /**
   * 自定义只读模式的渲染器
   * @params props 关于dom的配置
   * @params dom 默认的 dom
   * @return 返回一个用于读的 dom
   */
  render?:
    | ((
        text: any,
        props: Omit<ProFieldFCRenderProps, 'value' | 'onChange'>,
        dom: JSX.Element,
      ) => JSX.Element)
    | undefined;
  /**
   * 一个自定义的编辑渲染器。
   * @params text 默认的值类型
   * @params props 关于dom的配置
   * @params dom 默认的 dom
   * @return 返回一个用于编辑的dom
   */
  renderFormItem?:
    | ((text: any, props: ProFieldFCRenderProps, dom: JSX.Element) => JSX.Element)
    | undefined;
};

export type ParamsType = Record<string, any>;

/**
 * 自带的token 配置
 */
export type ConfigContextPropsType = {
  intl?: IntlType;
  valueTypeMap?: Record<string, ProRenderFieldPropsType>;
  token?: ProAliasToken;
  hashId?: string;
  hashed?: boolean;
  dark?: boolean;
  theme?: Theme<any, any>;
};

/* Creating a context object with the default values. */
const ProConfigContext = React.createContext<ConfigContextPropsType>({
  intl: {
    ...zhCNIntl,
    locale: 'default',
  },
  valueTypeMap: {},
  theme: emptyTheme,
  hashed: true,
  dark: false,
  token: defaultToken as ProAliasToken,
});

export const { Consumer: ConfigConsumer } = ProConfigContext;

/**
 * 组件解除挂载后清空一下 cache
 * @date 2022-11-28
 * @returns null
 */
const CacheClean = () => {
  const { cache } = useSWRConfig();

  useEffect(() => {
    return () => {
      // is a map
      // @ts-ignore
      cache.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

/**
 * 用于配置 Pro 的组件,分装之后会简单一些
 * @param props
 * @returns
 */
const ConfigProviderContainer: React.FC<{
  children: React.ReactNode;
  autoClearCache?: boolean;
  valueTypeMap?: Record<string, ProRenderFieldPropsType>;
  token?: DeepPartial<ProAliasToken>;
  hashed?: boolean;
  dark?: boolean;
  prefixCls?: string;
}> = (props) => {
  const {
    children,
    dark,
    valueTypeMap,
    autoClearCache = false,
    token: propsToken,
    prefixCls,
  } = props;
  const { locale, getPrefixCls, ...restConfig } = useContext(AntdConfigProvider.ConfigContext);
  const tokenContext = proTheme.useToken?.();
  const proProvide = useContext(ProConfigContext);

  /**
   * pro 的 类
   * @type {string}
   * @example .ant-pro
   */

  const proComponentsCls = prefixCls ? `.${prefixCls}` : `.${getPrefixCls()}-pro`;

  const antCls = '.' + getPrefixCls();

  const salt = `${proComponentsCls}`;
  /**
   * 合并一下token，不然导致嵌套 token 失效
   */
  const proLayoutTokenMerge = useMemo(() => {
    return getLayoutDesignToken(propsToken || {}, tokenContext.token || defaultToken);
  }, [propsToken, tokenContext.token]);

  const proProvideValue = useMemo(() => {
    const localeName = locale?.locale;
    const key = findIntlKeyByAntdLocaleKey(localeName);
    // antd 的 key 存在的时候以 antd 的为主
    const intl =
      localeName && proProvide.intl?.locale === 'default'
        ? intlMap[key!]
        : proProvide.intl || intlMap[key!];

    return {
      ...proProvide,
      dark: dark ?? proProvide.dark,
      token: merge(proProvide.token, tokenContext.token, {
        proComponentsCls,
        antCls,
        themeId: tokenContext.theme.id,
        layout: proLayoutTokenMerge,
      }),
      intl: intl || zhCNIntl,
    };
  }, [
    locale?.locale,
    proProvide,
    dark,
    tokenContext.token,
    tokenContext.theme.id,
    proComponentsCls,
    antCls,
    proLayoutTokenMerge,
  ]);

  const finalToken = {
    ...(proProvideValue.token || {}),
    proComponentsCls,
  };

  const [token, nativeHashId] = useCacheToken<ProAliasToken>(
    tokenContext.theme as unknown as Theme<any, any>,
    [tokenContext.token, finalToken ?? {}],
    {
      salt,
    },
  );

  const hashId = useMemo(() => {
    if (props.hashed === false) {
      return '';
    }
    if (proProvide.hashed === false) return '';

    if (typeof process !== 'undefined' && process.env.NODE_ENV?.toLowerCase() !== 'test')
      return nativeHashId;
    return '';
  }, [nativeHashId, proProvide.hashed, props.hashed]);

  const configProviderDom = useMemo(() => {
    const themeConfig = {
      ...restConfig.theme,
      hashId: hashId,
      hashed:
        typeof process !== 'undefined' &&
        process.env.NODE_ENV?.toLowerCase() !== 'test' &&
        props.hashed !== false &&
        proProvide.hashed !== false,
    };

    return (
      <AntdConfigProvider {...restConfig} theme={{ ...themeConfig }}>
        <ProConfigContext.Provider
          value={{
            ...proProvideValue!,
            valueTypeMap: valueTypeMap || proProvideValue?.valueTypeMap,
            token,
            theme: tokenContext.theme as unknown as Theme<any, any>,
            hashed: props.hashed,
            hashId,
          }}
        >
          <>
            {autoClearCache && <CacheClean />}
            {children}
          </>
        </ProConfigContext.Provider>
      </AntdConfigProvider>
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoClearCache, children, getPrefixCls, hashId, locale, proProvideValue, token]);

  if (!autoClearCache) return configProviderDom;

  return <SWRConfig value={{ provider: () => new Map() }}>{configProviderDom}</SWRConfig>;
};

/**
 * 用于配置 Pro 的一些全局性的东西
 * @param props
 * @returns
 */
export const ProConfigProvider: React.FC<{
  children: React.ReactNode;
  autoClearCache?: boolean;
  token?: DeepPartial<ProAliasToken>;
  needDeps?: boolean;
  valueTypeMap?: Record<string, ProRenderFieldPropsType>;
  dark?: boolean;
  hashed?: boolean;
  prefixCls?: string;
}> = (props) => {
  const { needDeps, dark, token } = props;
  const proProvide = useContext(ProConfigContext);
  const { locale, theme, ...rest } = useContext(AntdConfigProvider.ConfigContext);

  // 是不是不需要渲染 provide
  const isNullProvide =
    needDeps &&
    proProvide.hashId !== undefined &&
    Object.keys(props).sort().join('-') === 'children-needDeps';

  if (isNullProvide) return <>{props.children}</>;

  const mergeAlgorithm = () => {
    const isDark = dark ?? proProvide.dark;
    if (isDark && !Array.isArray(theme?.algorithm)) {
      return [proTheme.darkAlgorithm, theme?.algorithm].filter(Boolean);
    }
    if (isDark && Array.isArray(theme?.algorithm)) {
      return [proTheme.darkAlgorithm, ...(theme?.algorithm || [])].filter(Boolean);
    }
    return theme?.algorithm;
  };
  // 自动注入 antd 的配置
  const configProvider = {
    ...rest,
    locale: locale || zh_CN,
    theme: {
      ...theme,
      algorithm: mergeAlgorithm(),
    },
  } as typeof theme;

  return (
    <AntdConfigProvider {...configProvider}>
      <ConfigProviderContainer {...props} token={token} />
    </AntdConfigProvider>
  );
};

/**
 * It returns the intl object from the context if it exists, otherwise it returns the intl object for
 * 获取国际化的方法
 * @param locale
 * @param localeMap
 * the current locale
 * @returns The return value of the function is the intl object.
 */
export function useIntl(): IntlType {
  const { locale } = useContext(AntdConfigProvider.ConfigContext);
  const { intl } = useContext(ProConfigContext);

  if (intl && intl.locale !== 'default') {
    return intl || zhCNIntl;
  }

  if (locale?.locale) {
    return intlMap[findIntlKeyByAntdLocaleKey(locale.locale)] || zhCNIntl;
  }

  return zhCNIntl;
}

ProConfigContext.displayName = 'ProProvider';

export const ProProvider = ProConfigContext;

export default ProConfigContext;
