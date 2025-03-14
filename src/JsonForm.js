import React, { useEffect, useState, useCallback } from 'react';
import { componentStyles } from './styles/JsonFormStyles';
import { Container, FormSection, JsonSection } from './styles/StyledComponents';
import JsonFormField from './components/JsonFormField';

function JsonForm() {
    const [jsonData, setJsonData] = useState({});
    const [rawJson, setRawJson] = useState('');
    const [availablePaths, setAvailablePaths] = useState([]);
    const [approvedKeys, setApprovedKeys] = useState(['*']);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const extractPaths = useCallback((obj, parentPath = '') => {
        const paths = ['*'];
        
        const traverse = (obj, path) => {
            Object.entries(obj).forEach(([key, value]) => {
                const currentPath = path ? `${path}.${key}` : key;
                paths.push(currentPath);
                
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    traverse(value, currentPath);
                }
            });
        };
        
        traverse(obj, parentPath);
        return paths.filter((path, index) => paths.indexOf(path) === index);
    }, []);

    useEffect(() => {
        fetch(process.env.PUBLIC_URL + '/data.json')
            .then(response => response.ok ? response.json() : Promise.reject('Failed to fetch'))
            .then(data => {
                setJsonData(data);
                setRawJson(JSON.stringify(data, null, 4));
                setAvailablePaths(extractPaths(data));
            })
            .catch(error => console.error('Error loading JSON data:', error))
            .finally(() => setLoading(false));
    }, [extractPaths]);
    
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
            return newValue.toLowerCase() === 'true';
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

    const handleJsonChange = (e) => {
        const newRawJson = e.target.value;
        setRawJson(newRawJson);
    
        try {
            const updatedJson = JSON.parse(newRawJson);
            setJsonData(updatedJson);
            setAvailablePaths(extractPaths(updatedJson));
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
            return key
                .split(/(?=[A-Z])|_|\s/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        };
    
        
        const hasDirectlyApprovedChildren = (obj, objPath) => {
            const traverse = (value, path) => {
                if (typeof value !== 'object' || value === null) {
                    return isPathApproved(path);
                }

                return Object.entries(value).some(([key, val]) => {
                    const newPath = [...path, key];
                    if (isPathApproved(newPath)) return true;
                    return traverse(val, newPath);
                });
            };

            return traverse(obj, objPath);
        };
        
        const fields = Object.entries(data).reduce((acc, [key, value]) => {
            const currentPath = [...keyPath, key];
            
            if (isPathApproved(currentPath)) {
                acc.push([key, value]);
                return acc;
            }
        
            if (typeof value === 'object' && value !== null) {
                // Check both direct children and nested paths
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
    
        const renderField = ([key, value], path) => {
            const currentPath = [...path, key];
            const currentPathString = currentPath.join('.');
            const displayKey = formatKeyName(key);
        
            if (Array.isArray(value)) {
                const hasApprovedFields = value.some((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        return hasDirectlyApprovedChildren(item, [...currentPath, index]);
                    }
                    return isPathApproved([...currentPath, index]);
                });
        
                if (!hasApprovedFields) {
                    return null;
                }
        
                return (
                    <div key={currentPathString} style={componentStyles.arrayContainer}>
                        <div style={componentStyles.arrayHeader}>
                            {displayKey}
                        </div>
                        {value.map((item, index) => (
                            <div key={`${currentPathString}-${index}`} style={componentStyles.nested}>
                                <div style={componentStyles.arrayHeader}>
                                    Item {index + 1}
                                </div>
                                <div style={{ width: '100%' }}>
                                    {renderFields(item, [...currentPath, index], false)}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }
    
            if (typeof value === 'object' && value !== null) {
                const hasApprovedFields = hasDirectlyApprovedChildren(value, currentPath);
        
                if (hasApprovedFields) {
                    return (
                        <div key={currentPathString} style={componentStyles.section}>
                            <div style={{ ...componentStyles.row, fontWeight: 'bold' }}>
                                {displayKey}
                            </div>
                            {renderFields(value, currentPath, false)}
                        </div>
                    );
                }
                return null;
            }
    
            if (isPathApproved(currentPath)) {
                return (
                    <JsonFormField
                        key={currentPathString}
                        path={currentPath}
                        value={value}
                        label={displayKey}
                        onChange={handleInputChange}
                        styles={componentStyles}
                    />
                );
            }
            return null;
        };
    
        return (
            <>
                {fields.map(field => renderField(field, keyPath))}
            </>
        );
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2>JSON Form Editor</h2>
            <hr />
            <Container>
                <FormSection>
                    <h3>JSON Fields</h3>
                    {renderFields(jsonData)}
                    
                </FormSection>
                <JsonSection>
                    <h3>JSON Input/Output</h3>
                    <textarea
                        className="json-output"
                        value={rawJson}
                        onChange={handleJsonChange}
                        style={componentStyles.jsonOutput}
                    />
                    {error && <div style={{ color: 'red' }}>Invalid JSON: {error}</div>}
                    <h3>Visible Keys</h3>
                    <select
                        multiple
                        value={approvedKeys}
                        onChange={handleApprovedKeysChange}
                        style={componentStyles.keyApproval}
                    >
                        {availablePaths.map((path) => (
                            <option key={path} value={path}>
                                {path}
                            </option>
                        ))}
                    </select>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                        Hold Ctrl (Cmd on Mac) to select multiple keys
                    </div>
                </JsonSection>
            </Container>
        </div>
    );
}

export default JsonForm;