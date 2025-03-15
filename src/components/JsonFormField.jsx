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
        <div className='row'>
            <label 
                htmlFor={currentPathString} 
            >
                {label}:
            </label>
            {inputType === 'checkbox' ? (
                <input
                    type="checkbox"
                    id={currentPathString}
                    checked={value}
                    onChange={handleChange}
                />
            ) : (
                <input
                    type={inputType}
                    id={currentPathString}
                    value={formatValue(value, inputType)}
                    onChange={handleChange}
                    step={inputType === 'number' ? 'any' : undefined}
                />
            )}
        </div>
    );
};

export default JsonFormField;