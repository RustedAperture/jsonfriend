import React from 'react';

const JsonFormField = ({ 
    path, 
    value, 
    label, 
    onChange, 
    styles 
}) => {
    const currentPathString = path.join('.');
    
    return (
        <div className='row' style={styles.row}>
            <label 
                htmlFor={currentPathString} 
                style={styles.label}
            >
                {label}:
            </label>
            <input
                type="text"
                id={currentPathString}
                value={value}
                onChange={(e) => onChange(path, e.target.value)}
                style={styles.input}
            />
        </div>
    );
};

export default JsonFormField;