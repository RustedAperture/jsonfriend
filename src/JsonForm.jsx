import React, { useEffect, useState, useCallback } from 'react';
import JsonFormField from './components/JsonFormField.jsx';
import yaml from 'js-yaml';

function JsonForm() {
    const [jsonData, setJsonData] = useState({});
    const [rawJson, setRawJson] = useState('');
    const [availablePaths, setAvailablePaths] = useState([]);
    const [approvedKeys, setApprovedKeys] = useState(['*']);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [format, setFormat] = useState('json');

    const formatData = (data, format) => {
        try {
            if (format === 'yaml') {
                return yaml.dump(data);
            }
            return JSON.stringify(data, null, 4);
        } catch (error) {
            console.error('Error formatting data:', error);
            return '';
        }
    };

    const parseData = (text, format) => {
        try {
            if (format === 'yaml') {
                return yaml.load(text);
            }
            return JSON.parse(text);
        } catch (error) {
            throw new Error(`Invalid ${format.toUpperCase()}: ${error.message}`);
        }
    };

    const extractPaths = useCallback((obj, parentPath = '') => {
        const paths = ['*'];
        
        const traverse = (obj, path) => {
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    const currentPath = path ? `${path}.${index}` : `${index}`;
                    paths.push(currentPath);
                    
                    if (item && typeof item === 'object') {
                        traverse(item, currentPath);
                    }
                });
            } else {
                Object.entries(obj).forEach(([key, value]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    paths.push(currentPath);
                    
                    if (value && typeof value === 'object') {
                        traverse(value, currentPath);
                    }
                });
            }
        };
        
        traverse(obj, parentPath);
        return paths.filter((path, index) => paths.indexOf(path) === index);
    }, []);

    useEffect(() => {
        fetch(import.meta.env.BASE_URL + 'data.json')
            .then(response => response.ok ? response.json() : Promise.reject('Failed to fetch'))
            .then(data => {
                setJsonData(data);
                setRawJson(formatData(data, format));
                setAvailablePaths(extractPaths(data));
            })
            .catch(error => console.error('Error loading data:', error))
            .finally(() => setLoading(false));
    }, [extractPaths, format]);
    
    useEffect(() => {
        const textarea = document.querySelector('.json-output');
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    }, [rawJson]);

    const handleApprovedKeysChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
        setApprovedKeys(selectedOptions);
    };

    const convertValue = (originalValue, newValue) => {
        if (typeof originalValue === 'number') {
            return newValue === '' ? 0 : Number(newValue);
        }
        if (typeof originalValue === 'boolean') {
            return typeof newValue === 'boolean' ? newValue : newValue === 'true';
        }
        return newValue;
    };
    
    const handleInputChange = (keyPath, value) => {
        setJsonData(prevData => {
            const updatedData = { ...prevData };
            let current = updatedData;
            
            const originalValue = keyPath.reduce((obj, key) => obj[key], prevData);
            const convertedValue = convertValue(originalValue, value);
            
            keyPath.slice(0, -1).forEach(key => {
                current = current[key];
            });
            current[keyPath[keyPath.length - 1]] = convertedValue;
            
            setRawJson(JSON.stringify(updatedData, null, 4));
            return updatedData;
        });
    };

    const handleDataChange = (e) => {
        const newRawText = e.target.value;
        setRawJson(newRawText);
    
        try {
            const updatedData = parseData(newRawText, format);
            setJsonData(updatedData);
            setAvailablePaths(extractPaths(updatedData));
            setError(null);
        } catch (error) {
            setError(error.message);
        }
    };

    const isPathApproved = (path) => {
        if (approvedKeys.includes('*')) return true;
        const pathString = path.join('.');
        return approvedKeys.some(approvedKey => {
            if (pathString === approvedKey) return true;
            if (approvedKey.startsWith(pathString + '.')) return true;
            if (pathString.startsWith(approvedKey + '.')) return true;
            return false;
        });
    };

    const renderFields = (data, keyPath = [], isRoot = true) => {
        const formatKeyName = (key) => {
            if (typeof key === 'number') {
                return `Item ${key + 1}`;
            }
            
            return key
                .split(/(?=[A-Z])|_|\s/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        };
    
        const hasDirectlyApprovedChildren = (obj, objPath) => {
            if (typeof obj !== 'object' || obj === null) {
                return isPathApproved(objPath);
            }
    
            if (Array.isArray(obj)) {
                if (isPathApproved(objPath)) return true;
                return obj.some((_, index) => isPathApproved([...objPath, index]));
            }
    
            return Object.keys(obj).some(key => isPathApproved([...objPath, key]));
        };
    
        const fields = Object.entries(data).reduce((acc, [key, value]) => {
            const currentPath = [...keyPath, key];
    
            if (isPathApproved(currentPath)) {
                acc.push([key, value]);
                return acc;
            }
    
            if (typeof value === 'object' && value !== null) {
                const isPrimitiveArray = Array.isArray(value) && 
                    value.every(item => typeof item !== 'object' || item === null);
    
                if (isPrimitiveArray && isPathApproved(currentPath)) {
                    acc.push([key, value]);
                    return acc;
                }
    
                const hasApprovedFields = Object.keys(value).some(childKey => {
                    const childPath = [...currentPath, childKey];
                    const childValue = value[childKey];
                    
                    return isPathApproved(childPath) || 
                           (typeof childValue === 'object' && childValue !== null && 
                            hasDirectlyApprovedChildren(childValue, childPath));
                });
                
                if (hasApprovedFields) {
                    acc.push([key, value]);
                }
            }
            
            return acc;
        }, []);
    
        if (isRoot && approvedKeys.length === 1 && approvedKeys[0] !== '*' && approvedKeys[0].indexOf('*') === -1) {
            // Only apply the special case logic if there is exactly one approved key and it's not the wildcard
            const onlyApprovedPath = approvedKeys[0].split('.');
            let currentLevel = jsonData;
            let currentPath = [];
    
            for (let i = 0; i < onlyApprovedPath.length; i++) {
                const key = onlyApprovedPath[i];
                currentPath.push(key);
    
                if (i === onlyApprovedPath.length - 1) {
                    // This is the only approved child level, render it with its heading
                    const displayKey = currentPath.map(formatKeyName).join(' / '); // Get the display key
                    return (
                        <div key={currentPath.join('.')} className='flex flex-col gap-1'>
                            <h4 className="font-medium text-gray-700 mb-2 pb-1 border-b border-gray-200">
                                {displayKey}
                            </h4>
                            {renderFields(currentLevel[key], currentPath, false)}
                        </div>
                    );
                }
    
                if (currentLevel && currentLevel[key]) {
                    currentLevel = currentLevel[key];
                } else {
                    return null; // Handle cases where the path doesn't exist
                }
            }
            return null; // If no path found, return null
        }
    
        const renderField = ([key, value], path) => {
            const currentPath = [...path, key];
            const currentPathString = currentPath.join('.');
            const displayKey = currentPath.map(formatKeyName).join(' / ');
            const labelKey = formatKeyName(key);
        
            const hasEditableFields = (obj, objPath) => {
                if (typeof obj !== 'object' || obj === null) {
                    return isPathApproved(objPath) && (
                        typeof obj === 'string' ||
                        typeof obj === 'number' ||
                        typeof obj === 'boolean'
                    );
                }
        
                if (Array.isArray(obj)) {
                    const isPrimitiveArray = obj.every(item => 
                        typeof item !== 'object' || item === null
                    );
                    if (isPrimitiveArray && isPathApproved(objPath)) {
                        return true;
                    }
                    return obj.some((item, index) => hasEditableFields(item, [...objPath, index]));
                }
        
                return Object.entries(obj).some(([k, v]) => 
                    hasEditableFields(v, [...objPath, k])
                );
            };
        
            if (Array.isArray(value)) {
                const isPrimitiveArray = value.every(item => typeof item !== 'object' || item === null);
        
                if (isPrimitiveArray && isPathApproved(currentPath)) {
                    return (
                        <div key={currentPathString}>
                            <label className="block font-medium text-gray-700 mb-1">{labelKey}</label>
                            <textarea
                                className="w-full rounded-sm border-2 border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                                value={value.join(', ')}
                                onChange={(e) => {
                                    const newValue = e.target.value.split(',').map(item => item.trim());
                                    handleInputChange(currentPath, newValue);
                                }}
                            />
                        </div>
                    );
                }
        
                return (
                    <>
                        {value.map((item, index) => {
                            const itemPath = [...currentPath, index];
                            if (isPathApproved(itemPath) || 
                                (typeof item === 'object' && item !== null && hasDirectlyApprovedChildren(item, itemPath))) {
                                
                                const hasEditableContent = hasEditableFields(item, itemPath);
        
                                return (
                                    <React.Fragment key={itemPath.join('.')}>
                                        {hasEditableContent && (
                                            <h4 className="font-medium text-gray-700 mb-2 pb-1 border-b border-gray-200">
                                                {displayKey} / {formatKeyName(index)}
                                            </h4>
                                        )}
                                        {renderFields(item, itemPath, false)}
                                    </React.Fragment>
                                );
                            }
                            return null;
                        })}
                    </>
                );
            }
        
            if (typeof value === 'object' && value !== null) {
                const hasApprovedFields = hasDirectlyApprovedChildren(value, currentPath);
                const hasEditableContent = hasEditableFields(value, currentPath);
            
                if (!hasApprovedFields || !hasEditableContent) return null;
            
                // Check if this is the only approved path
                const isOnlyApprovedPath = approvedKeys.length === 1 && approvedKeys[0] === currentPathString;
            
                // If it's the only approved path, render its children directly
                if (isOnlyApprovedPath) {
                    return renderFields(value, currentPath, false);
                }
            
                // Skip rendering top-level headings if wildcard is selected and at the root level
                if (approvedKeys.includes('*') && isRoot) {
                    return renderFields(value, currentPath, false);
                }
            
                // Only render this level if it has immediate editable children
                const hasImmediateEditableChildren = Object.entries(value).some(([childKey, childValue]) => {
                    const childPath = [...currentPath, childKey];
                    return typeof childValue !== 'object' && hasEditableFields(childValue, childPath);
                });
            
                if (!hasImmediateEditableChildren) {
                    return renderFields(value, currentPath, false);
                }
            
                return (
                    <div key={currentPathString} className='flex flex-col gap-1'>
                        <h4 className="font-medium text-gray-700 border-b border-gray-200">
                            {displayKey}
                        </h4>
                        {renderFields(value, currentPath, false)}
                    </div>
                );
            }
        
            if (isPathApproved(currentPath)) {
                return (
                    <div key={currentPathString}>
                        <JsonFormField
                            path={currentPath}
                            value={value}
                            label={labelKey}
                            onChange={handleInputChange}
                        />
                    </div>
                );
            }
            return null;
        };
    
        return (
            <>
                {isRoot && fields.map(field => {
                    const [key, value] = field;
                    if (typeof value !== 'object' || value === null) {
                        return renderField(field, keyPath);
                    }
                    return null;
                })}
                
                {isRoot && fields.map(field => {
                    const [key, value] = field;
                    if (typeof value === 'object' && value !== null) {
                        return renderField(field, keyPath);
                    }
                    return null;
                })}
                
                {!isRoot && fields.map(field => {
                    const [key, value] = field;
                    return renderField(field, keyPath);
                })}
            </>
        );
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2>Data Form Editor</h2>
            <hr className='not-prose text-gray-400'/>
            <div className='flex flex-wrap gap-4'>
                <div className='basis-lg flex flex-col gap-1'>
                    <h3>Form Fields</h3>
                    {renderFields(jsonData)}
                </div>
                <div className='grow flex flex-col gap-1'>
                    <div className='flex justify-between items-center'>
                        <h3>Input/Output</h3>
                        <select 
                            value={format} 
                            onChange={(e) => {
                                setFormat(e.target.value);
                                setRawJson(formatData(jsonData, e.target.value));
                            }}
                            className='p-1 pr-10 rounded-sm border-2 border-gray-300'
                        >
                            <option value="json">JSON</option>
                            <option value="yaml">YAML</option>
                        </select>
                    </div>
                    <textarea
                        className="json-output w-full rounded-sm border-2 border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                        value={rawJson}
                        onChange={handleDataChange}
                        wrap='off'
                    />
                    {error && <div className='text-sm text-red-400'>{error}</div>}
                    <h3>Visible Keys</h3>
                    <select
                        multiple
                        value={approvedKeys}
                        onChange={handleApprovedKeysChange}
                        className='p-2 w-full grow rounded-sm border-2 border-gray-300 focus:ring-gray-500 focus:border-gray-500'
                    >
                        {availablePaths.map((path) => (
                            <option className='px-2 py-1' key={path} value={path}>
                                {path}
                            </option>
                        ))}
                    </select>
                    <div className='text-sm text-gray-500'>
                        Hold Ctrl (Cmd on Mac) to select multiple keys
                    </div>
                </div>
            </div>
        </div>
    );
}

export default JsonForm;