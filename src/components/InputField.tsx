import { FieldError } from "react-hook-form";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string | number;
  error?: FieldError;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  hidden?: boolean;
};


const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  inputProps,
  hidden
}: InputFieldProps) => {




  
  return (
    <div className={hidden ? "hidden" : " flex flex-col gap-2 w-full md:w-1/4"}>
      <label className=" text-xs text-gray-500">{label}</label>
      <input
        type={type}
        {...register(name)}
        className=" ring-[1.5px] ring-gray-300 rounded-md text-sm p-2 w-full"
        {...inputProps}
        defaultValue={defaultValue}
      />
      {error?.message && (
        <p className=" text-red-400 text-xs">
          {error?.message.toString()}
        </p>
      )}
    </div>
  );
};
export default InputField;
