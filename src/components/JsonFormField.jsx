import React from 'react';
import { getInputType, formatValue } from '../utils/inputType';

const JsonFormField = ({ 
    path, 
    value, 
    label, 
    onChange, 
    styles 
}) => {
    const currentPathString = path.join('.');
    const inputType = getInputType(value);
    
    const handleChange = (e) => {
        const newValue = inputType === 'checkbox' ? e.target.checked : e.target.value;
        onChange(path, newValue);
    };

    return (
        <div className='flex items-center'>
            <label 
                htmlFor={currentPathString}
                className='mr-auto'
            >
                {label}:
            </label>
            {inputType === 'checkbox' ? (
                <input
                    type="checkbox"
                    id={currentPathString}
                    checked={value}
                    onChange={handleChange}
                    className='rounded-sm border-2 border-gray-300 focus:ring-gray-500 focus:border-gray-500'
                />
            ) : (
                <input
                    type={inputType}
                    id={currentPathString}
                    value={formatValue(value, inputType)}
                    onChange={handleChange}
                    step={inputType === 'number' ? 'any' : undefined}
                    className='rounded-sm border-2 border-gray-300 focus:ring-gray-500 focus:border-gray-500'
                />
            )}
        </div>
    );
};

export default JsonFormField;