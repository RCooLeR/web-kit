// Section tabs of a settings screen ("General · Reading · Permalinks"): the Tabs of
// @rcooler/react-ui in the admin look. Tabs with an address are links, so each section can be
// opened directly; tabs without one are buttons that switch a view.
import { Tabs, cx, type TabsProps } from "@rcooler/react-ui";

export type NavTabsProps = TabsProps;

export function NavTabs({ className, ...props }: NavTabsProps) {
  return <Tabs {...props} className={cx("rc-nav-tabs", className)} />;
}
