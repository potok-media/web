export interface TVSelectOption<T = string | number> {
  value: T;
  label: string;
}

interface TVSelectProps<T> {
  value: T;
  options: readonly TVSelectOption<T>[] | TVSelectOption<T>[];
  onChange: (value: T) => void;
  focusKeyPrefix?: string;
}

export function TVSelect<T extends string | number>({
  value,
  options,
  onChange,
}: TVSelectProps<T>) {
  return (
    <select
      className="settings-select"
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        const numVal = Number(val);
        onChange((isNaN(numVal) ? val : numVal) as T);
      }}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default TVSelect;
