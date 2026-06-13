import * as React from "react";
import { cn } from "../../lib/utils";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto border border-slate-200 rounded-md">
      <table
        ref={ref}
        className={cn("w-full text-sm border-collapse", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("bg-slate-50 border-b border-slate-200", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-slate-200", className)} {...props} />
));
TableBody.displayName = "TableBody";

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "bg-white hover:bg-primary-50/60 transition-colors",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider",
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("px-4 py-3 text-slate-700 whitespace-nowrap", className)}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";
