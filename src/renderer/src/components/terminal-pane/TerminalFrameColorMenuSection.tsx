import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import { PRESET_TAB_COLORS } from '../tab-bar/tab-colors'

export function TerminalFrameColorMenuSection({
  tabColor,
  onSetTabColor,
  onOpenChange
}: {
  tabColor?: string | null
  onSetTabColor: (color: string | null) => void
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  return (
    <>
      <DropdownMenuSeparator />
      <div className="px-2 pt-1.5 pb-1">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1.5">
          <span>{translate('auto.components.tab.bar.SortableTabContextMenu.35e8892fd0', 'Frame Color')}</span>
          <label
            className="relative flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-dashed border-muted-foreground/60 hover:border-foreground overflow-hidden"
            title="自訂色彩 (Custom Color)"
          >
            <span className="text-[9px] font-mono leading-none select-none text-muted-foreground">+</span>
            <input
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={tabColor ?? '#3b82f6'}
              onChange={(e) => {
                onSetTabColor(e.target.value)
                onOpenChange(false)
              }}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_TAB_COLORS.map((color) => {
            const isSelected = tabColor === color.value
            return (
              <DropdownMenuItem
                key={color.label}
                className={`relative h-4 w-4 min-w-4 p-0 rounded-full border cursor-pointer ${
                  isSelected ? 'ring-1 ring-foreground/70 ring-offset-1 ring-offset-popover' : ''
                } ${
                  color.value ? 'border-transparent' : 'border-muted-foreground/50 bg-transparent'
                }`}
                style={color.value ? { backgroundColor: color.value } : undefined}
                onSelect={() => {
                  onSetTabColor(color.value)
                }}
                title={color.label}
              >
                {color.value === null && (
                  <span className="absolute block h-px w-3 rotate-45 bg-muted-foreground/80" />
                )}
              </DropdownMenuItem>
            )
          })}
        </div>
      </div>
    </>
  )
}
