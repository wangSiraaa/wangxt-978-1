import * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "./Badge";

export type StatusTagType =
  | "batch"
  | "clothing"
  | "qc"
  | "lock"
  | "auto";

export interface StatusTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  type?: StatusTagType;
  statusMap?: Record<string, { label: string; variant: string }>;
}

const getBatchStatusStyle = (status: string) => {
  const s = status.toLowerCase();
  if (["pending", "待处理", "待开始"].includes(s))
    return { variant: "slate" as const, text: status };
  if (["processing", "进行中", "生产中", "洗涤中"].includes(s))
    return { variant: "accent" as const, text: status };
  if (["completed", "已完成", "完成"].includes(s))
    return { variant: "success" as const, text: status };
  if (["cancelled", "已取消", "取消"].includes(s))
    return { variant: "danger" as const, text: status };
  return { variant: "primary" as const, text: status };
};

const getClothingStatusStyle = (status: string) => {
  const s = status.toLowerCase();
  if (["dirty", "脏污", "待洗涤"].includes(s))
    return { variant: "slate" as const, text: status };
  if (["washing", "洗涤中"].includes(s))
    return { variant: "accent" as const, text: status };
  if (["clean", "已清洗", "干净"].includes(s))
    return { variant: "success" as const, text: status };
  if (["damaged", "破损", "报废"].includes(s))
    return { variant: "danger" as const, text: status };
  return { variant: "primary" as const, text: status };
};

const getQcStatusStyle = (status: string) => {
  const s = status.toLowerCase();
  if (["pass", "合格", "通过"].includes(s))
    return { variant: "success" as const, text: status };
  if (["fail", "不合格", "未通过", "失败"].includes(s))
    return { variant: "danger" as const, text: status };
  if (["pending", "待质检", "待检"].includes(s))
    return { variant: "warning" as const, text: status };
  return { variant: "primary" as const, text: status };
};

const getLockStatusStyle = (status: string) => {
  const s = status.toLowerCase();
  if (["locked", "已锁定", "锁定"].includes(s))
    return { variant: "danger" as const, text: status };
  if (["unlocked", "未锁定", "解锁"].includes(s))
    return { variant: "success" as const, text: status };
  return { variant: "slate" as const, text: status };
};

const autoDetect = (status: string) => {
  const s = status.toLowerCase();
  if (
    ["合格", "pass", "通过", "已完成", "completed", "clean", "干净", "已清洗", "unlocked", "解锁", "未锁定"].includes(
      s
    )
  )
    return { variant: "success" as const, text: status };
  if (
    ["不合格", "fail", "失败", "破损", "damaged", "报废", "cancelled", "已取消", "取消", "locked", "锁定", "已锁定"].includes(
      s
    )
  )
    return { variant: "danger" as const, text: status };
  if (
    ["进行中", "processing", "洗涤中", "washing", "生产中", "accent", "待质检", "pending"].includes(
      s
    )
  )
    return { variant: "accent" as const, text: status };
  if (["待检", "warning", "待处理"].includes(s))
    return { variant: "warning" as const, text: status };
  if (["脏污", "dirty", "待洗涤", "slate"].includes(s))
    return { variant: "slate" as const, text: status };
  return { variant: "primary" as const, text: status };
};

export const StatusTag = React.forwardRef<HTMLSpanElement, StatusTagProps>(
  ({ className, status, type = "auto", statusMap, ...props }, ref) => {
    let result;
    if (statusMap && statusMap[status]) {
      const mapped = statusMap[status];
      result = { variant: mapped.variant as any, text: mapped.label };
    } else {
      switch (type) {
        case "batch":
          result = getBatchStatusStyle(status);
          break;
        case "clothing":
          result = getClothingStatusStyle(status);
          break;
        case "qc":
          result = getQcStatusStyle(status);
          break;
        case "lock":
          result = getLockStatusStyle(status);
          break;
        default:
          result = autoDetect(status);
      }
    }

    return (
      <Badge ref={ref} variant={result.variant} className={cn(className)} {...props}>
        {result.text}
      </Badge>
    );
  }
);

StatusTag.displayName = "StatusTag";
