// @rcooler/react-admin: admin screen patterns in the familiar publishing-dashboard layout. The app
// loads "@rcooler/react-admin/admin.css" once and maps its theme onto the --rc-admin-* custom
// properties (see the README). Every text a component shows comes from the app, in its language;
// the English defaults exist for tests and prototypes.

export { AdminLayout, ADMIN_PHONE_QUERY } from "./AdminLayout.js";
export type { AdminLayoutProps } from "./AdminLayout.js";
export { AdminMenu } from "./AdminMenu.js";
export type { AdminMenuItem, AdminMenuProps, AdminMenuSection } from "./AdminMenu.js";
export { BulkActions } from "./BulkActions.js";
export type { BulkAction, BulkActionsProps } from "./BulkActions.js";
export { FormActions, FormTable, FormTableRow } from "./FormTable.js";
export type { FormTableProps, FormTableRowProps } from "./FormTable.js";
export { ListSearch } from "./ListSearch.js";
export type { ListSearchProps } from "./ListSearch.js";
export { ListTable, defaultListTableLabels } from "./ListTable.js";
export type {
  ListColumn,
  ListTableLabels,
  ListTableProps,
  ListTableSelection,
  RowAction,
} from "./ListTable.js";
export { ListViews } from "./ListViews.js";
export type { ListView, ListViewsProps } from "./ListViews.js";
export { NavTabs } from "./NavTabs.js";
export type { NavTabsProps } from "./NavTabs.js";
export { Notice } from "./Notice.js";
export type { NoticeProps, NoticeTone } from "./Notice.js";
export { Pagination, defaultPaginationLabels } from "./Pagination.js";
export type { PaginationLabels, PaginationProps } from "./Pagination.js";
export { PostBox, PostBoxes, defaultPostBoxLabels, usePostBoxLayout } from "./PostBox.js";
export type {
  PostBoxDefinition,
  PostBoxLabels,
  PostBoxLayout,
  PostBoxLayoutState,
  PostBoxProps,
  PostBoxesProps,
} from "./PostBox.js";
export { PageActionLink, ScreenHeader } from "./ScreenHeader.js";
export type { PageAction, ScreenHeaderProps } from "./ScreenHeader.js";
export { ScreenOptions } from "./ScreenOptions.js";
export type {
  ScreenOptionChoice,
  ScreenOptionGroup,
  ScreenOptionsPerPage,
  ScreenOptionsProps,
} from "./ScreenOptions.js";
export { useListSelection } from "./useListSelection.js";
export type { ListSelection } from "./useListSelection.js";
