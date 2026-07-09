import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxProps {
    options: { value: string; label: string }[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    className?: string;
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = "Select an option...",
    searchPlaceholder = "Search...",
    emptyMessage = "No results found.",
    className,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false);

    return (
        // 1. Add modal={true} to handle focus/scroll-lock correctly inside Dialogs
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                >
                    {value
                        ? options.find((option) => option.value === value)?.label
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            
            {/* 2. 'z-[200]' forces it above the Dialog (which is usually z-50).
               3. 'w-[--radix-popover-trigger-width]' makes it match the button width exactly.
               4. 'p-0' ensures no padding bloat.
            */}
            <PopoverContent 
                className="w-[--radix-popover-trigger-width] p-0 z-[200]" 
                align="start"
            >
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    
                    {/* 5. max-h + overflow makes the internal list scrollable 
                       without scrolling the whole page.
                    */}
                    <CommandList className="max-h-[250px] overflow-y-auto overflow-x-hidden">
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={(currentValue) => {
                                        onValueChange(currentValue === value ? "" : currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}