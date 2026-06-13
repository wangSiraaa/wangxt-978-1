import * as React from "react";
import { cn } from "../../lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  registerTab: (v: string, el: HTMLButtonElement | null) => void;
  getTabEl: (v: string) => HTMLButtonElement | null;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
};

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  children?: React.ReactNode;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  activeKey?: string;
  onValueChange?: (value: string) => void;
  onChange?: (value: string) => void;
  items?: TabItem[];
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  activeKey,
  onValueChange,
  onChange,
  className,
  children,
  items,
  ...props
}) => {
  const tabRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const currentValue = value || activeKey || '';

  const handleValueChange = React.useCallback(
    (v: string) => {
      onValueChange?.(v);
      onChange?.(v);
    },
    [onValueChange, onChange]
  );

  const registerTab = React.useCallback(
    (v: string, el: HTMLButtonElement | null) => {
      if (el) tabRefs.current.set(v, el);
      else tabRefs.current.delete(v);
    },
    []
  );

  const getTabEl = React.useCallback(
    (v: string) => tabRefs.current.get(v) || null,
    []
  );

  const tabsContent = items && items.length > 0 ? (
    <>
      <TabList>
        {items.map((item) => (
          <Tab key={item.key} value={item.key} disabled={item.disabled}>
            {item.icon && <item.icon className="w-4 h-4 mr-2" />}
            {item.label}
          </Tab>
        ))}
      </TabList>
      {items.map((item) => (
        <TabPanel key={item.key} value={item.key}>
          {item.children}
        </TabPanel>
      ))}
    </>
  ) : (
    children
  );

  return (
    <TabsContext.Provider
      value={{ value: currentValue, setValue: handleValueChange, registerTab, getTabEl }}
    >
      <div className={cn("w-full", className)} {...props}>
        {tabsContent}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabList: React.FC<TabListProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "relative flex items-center gap-1 border-b border-slate-200",
        className
      )}
      {...props}
    >
      {children}
      <TabIndicator />
    </div>
  );
};

const TabIndicator: React.FC = () => {
  const { value, getTabEl } = useTabsContext();
  const [style, setStyle] = React.useState<React.CSSProperties>({
    left: 0,
    width: 0,
  });

  const updateIndicator = React.useCallback(() => {
    const el = getTabEl(value);
    if (el) {
      setStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [value, getTabEl]);

  React.useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  React.useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  return (
    <span
      className="absolute bottom-0 h-0.5 bg-primary-500 transition-all duration-300 ease-out"
      style={style}
    />
  );
};

export interface TabProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(
  ({ value, className, children, onClick, ...props }, ref) => {
    const { setValue, registerTab } = useTabsContext();

    const innerRef = React.useRef<HTMLButtonElement>(null);
    React.useImperativeHandle(
      ref,
      () => innerRef.current as HTMLButtonElement
    );

    React.useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      registerTab(value, el);
      return () => registerTab(value, null);
    }, [value, registerTab]);

    return (
      <button
        ref={innerRef}
        type="button"
        onClick={(e) => {
          setValue(value);
          onClick?.(e);
        }}
        className={cn(
          "relative px-4 py-2.5 text-sm font-medium transition-colors duration-150 focus:outline-none",
          value === useTabsContext().value
            ? "text-primary-600"
            : "text-slate-500 hover:text-slate-700",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Tab.displayName = "Tab";

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  value,
  className,
  children,
  ...props
}) => {
  const { value: active } = useTabsContext();
  if (active !== value) return null;
  return (
    <div className={cn("pt-4", className)} {...props}>
      {children}
    </div>
  );
};
