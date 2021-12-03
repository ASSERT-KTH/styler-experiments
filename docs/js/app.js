angular.module('styler-experiments', ['ngRoute', 'ui.bootstrap', 'anguFixedHeaderTable'])
    .config(function($routeProvider, $locationProvider) {
        $routeProvider
            .when('/violation/:project/:id', {
                controller: 'violationController'
            })
            .when('/', {
                controller: 'mainController'
            });
        // configure html5 to get links working on jsfiddle
        $locationProvider.html5Mode(false);
    })
    .directive('keypressEvents', [
        '$document',
        '$rootScope',
        function($document, $rootScope) {
            return {
                restrict: 'A',
                link: function() {
                    $document.bind('keydown', function(e) {
                        $rootScope.$broadcast('keypress', e);
                        $rootScope.$broadcast('keypress:' + e.which, e);
                    });
                }
            };
        }
    ])
    .directive('diff', ['$http', function($http) {
        return {
            restrict: 'A',
            scope: {
                patch: '=diff'
            },
            link: function(scope, elem, attrs) {
                function printDiff(patch) {
                    $(elem).text('')
                    var diff = patch;
                    if (diff != null) {
                        var diff2htmlUi = new Diff2HtmlUI({ diff: diff });
                        diff2htmlUi.draw($(elem), { inputFormat: 'java', showFiles: false, matching: 'none' });
                        diff2htmlUi.highlightCode($(elem));
                    }
                }
                scope.$watch('patch', function() {
                    printDiff(scope.patch);
                })
                printDiff(scope.patch);
            }
        }
    }])
    .directive('violation', ['$http', function($http) {
        return {
            restrict: 'A',
            scope: {
                v: '=violation'
            },
            link: function(scope, elem, attrs) {
                function displayCode() {
                    $(elem).html('<pre><code class="hljs java" data-ln-start-from="' + (scope.v.information.violations[0].line - 2) + '">' + scope.v.source_code + '</code></pre>')
                    $('code.hljs').each(function(i, block) {
                        hljs.highlightBlock(block);
                        hljs.lineNumbersBlock(block);
                    });
                }
                scope.$watch('v', function() {
                    displayCode()
                })
                displayCode()
            }
        }
    }])

.controller('welcomeController', function($uibModalInstance) {
        this.ok = function() {
            $uibModalInstance.close();
        };
    })
    .controller('violationModal', function($rootScope, $uibModalInstance, violation, classifications, $http) {
        var $ctrl = this;
        $ctrl.violation = violation;
        $ctrl.classifications = classifications;

        $rootScope.$on('new_violation', function(e, violation) {
            $ctrl.violation = violation;
            download();
        });
        $ctrl.ok = function() {
            $uibModalInstance.close();
        };
        $ctrl.nextViolation = function() {
            $rootScope.$emit('next_violation', 'next');
        };
        $ctrl.previousViolation = function() {
            $rootScope.$emit('previous_violation', 'previous');
        };

        var getName = function(type, key) {
            for (var group in $ctrl.classifications[type]) {
                if ($ctrl.classifications[type][group][key]) {
                    if ($ctrl.classifications[type][group][key].fullname) {
                        return $ctrl.classifications[type][group][key].fullname;
                    } else {
                        return $ctrl.classifications[type][group][key].name;
                    }
                }
            }
            return null;
        }

        function download() {
            $http.get('data/' + $ctrl.violation['project_name'] + '-' + $ctrl.violation['violation_id'] + '.json').then(function(response) {
                $ctrl.info = response.data;
            })
        }

        download();
    })
    .controller('violationController', function($scope, $location, $rootScope, $routeParams, $uibModal) {
        var $ctrl = $scope;
        $ctrl.classifications = $scope.$parent.classifications;
        $ctrl.violations = $scope.$parent.filteredViolation;
        $ctrl.index = -1;
        $ctrl.violation = null;

        $scope.$watch("$parent.filteredViolation", function() {
            $ctrl.violations = $scope.$parent.filteredViolation;
            $ctrl.index = getIndex($routeParams.project, $routeParams.id);
        });
        $scope.$watch("$parent.classifications", function() {
            $ctrl.classifications = $scope.$parent.classifications;
        });

        var getIndex = function(project, violation_id) {
            if ($ctrl.violations == null) {
                return -1;
            }
            for (var i = 0; i < $ctrl.violations.length; i++) {
                if ($ctrl.violations[i].project_name == project && $ctrl.violations[i].violation_id == violation_id) {
                    return i;
                }
            }
            return -1;
        };

        $scope.$on('$routeChangeStart', function(next, current) {
            $ctrl.index = getIndex(current.params.project, current.params.id);
        });

        var modalInstance = null;
        $scope.$watch("index", function() {
            if ($scope.index != -1) {
                if (welcomeModal != null) {
                    welcomeModal.close();
                }
                if (modalInstance == null) {
                    modalInstance = $uibModal.open({
                        animation: true,
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: 'modelViolation.html',
                        controller: 'violationModal',
                        controllerAs: '$ctrl',
                        size: "lg",
                        resolve: {
                            violation: function() {
                                return $scope.violations[$scope.index];
                            },
                            classifications: $scope.classifications
                        }
                    });
                    modalInstance.result.then(function() {
                        modalInstance = null;
                        $location.path("/");
                    }, function() {
                        modalInstance = null;
                        $location.path("/");
                    })
                }
                $rootScope.$emit('new_violation', $scope.violations[$scope.index]);
            }
        });
        var welcomeModal = null;
        $scope.openWelcome = function() {
            welcomeModal = $uibModal.open({
                animation: true,
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: 'welcome.html',
                controller: 'welcomeController',
                controllerAs: '$ctrl',
                size: "lg"
            });
            welcomeModal.result.then(function() {
                welcomeModal = null;
            }, function() {
                welcomeModal = null;
            })
        };

        var nextViolation = function() {
            console.log($scope)
            var index = $scope.index + 1;
            if (index == $ctrl.violations.length) {
                index = 0;
            }
            console.log(index, $ctrl.violations)

            $location.path("/violation/" + $ctrl.violations[index].project_name + "/" + $ctrl.violations[index].violation_id);
            if (gtag) {
                gtag('event', 'next', {
                    'event_category': 'Shortcut'
                });
            }
            return false;
        };
        var previousViolation = function() {
            var index = $scope.index - 1;
            if (index < 0) {
                index = $ctrl.violations.length - 1;
            }

            $location.path("/violation/" + $ctrl.violations[index].project_name + "/" + $ctrl.violations[index].violation_id);
            if (gtag) {
                gtag('event', 'previous', {
                    'event_category': 'Shortcut'
                });
            }
            return false;
        };

        $scope.$on('keypress:39', function() {
            console.log('here')
            $scope.$apply(function() {
                nextViolation();
            });
        });
        $scope.$on('keypress:37', function() {
            $scope.$apply(function() {
                previousViolation();
            });
        });
        $rootScope.$on('next_violation', nextViolation);
        $rootScope.$on('previous_violation', previousViolation);
    })
    .controller('mainController', function($scope, $rootScope, $location, $window, $rootScope, $http, $uibModal) {
        $scope.sortType = ['project_name', 'violation_id']; // set the default sort type
        $scope.sortReverse = false;
        $scope.match = "all";
        $scope.filter = {};
        $scope.pageTitle = "Styler experiments";

        // create the list of sushi rolls 
        $scope.violations = [];
        $scope.classifications = [];

        $http.get("classification.json").then(function(response) {
            $scope.classifications = response.data;
        });

        $http.get("data/all.json").then(function(response) {
            $scope.violations = response.data;

            var projects = {};
            var nbProjects = 0;

            var violation_types = {};
            var nbExceptions = 0;

            var tools = {};
            var nbTools = 0;

            var not_fixed_by_tools = {};
            var not_fixed_by_nbTools = 0;

            for (var i = 0; i < $scope.violations.length; i++) {
                var project = $scope.violations[i].project_name;
                if (projects[project] == null) {
                    projects[project] = {
                        "name": project,
                        "fullname": project
                    }
                    nbProjects++;
                }
                $scope.violations[i][project] = true;

                var violation_type = $scope.violations[i].violation_type.substring($scope.violations[i].violation_type.lastIndexOf(".") + 1);
                if (violation_types[violation_type] == null) {
                    violation_types[violation_type] = {
                        "name": violation_type
                    }
                    nbExceptions++;
                }
                $scope.violations[i][violation_type] = true;

                for (var j = 0; j < $scope.violations[i].repaired_by.length; j++) {
                    var tool = $scope.violations[i].repaired_by[j];
                    if (tools[tool] == null) {
                        tools[tool] = {
                            "name": tool
                        }
                        nbTools++;
                    }
                    $scope.violations[i][tool] = true;
                }

                for (var j = 0; j < $scope.violations[i].not_repaired_by.length; j++) {
                    var tool = 'not ' + $scope.violations[i].not_repaired_by[j];
                    if (not_fixed_by_tools[tool] == null) {
                        not_fixed_by_tools[tool] = {
                            "name": tool
                        }
                        not_fixed_by_nbTools++;
                    }
                    $scope.violations[i][tool] = true;
                }
            }

            var sorted = [];
            for (var key in projects) {
                sorted[sorted.length] = key;
            }
            sorted.sort();
            var tempDict = {};
            for (var i = 0; i < sorted.length; i++) {
                tempDict[sorted[i]] = projects[sorted[i]];
            }

            projectLabel = "Projects (" + nbProjects + ")";
            $scope.classifications["Violations"][projectLabel] = tempDict;

            var sorted = [];
            for (var key in violation_types) {
                sorted[sorted.length] = key;
            }
            sorted.sort();
            var tempDict = {};
            for (var i = 0; i < sorted.length; i++) {
                tempDict[sorted[i]] = violation_types[sorted[i]];
            }

            violationTypeLabel = "Violation types (" + nbExceptions + ")";
            $scope.classifications["Violations"][violationTypeLabel] = tempDict;

            toolLabel = "Fixed by (" + nbTools + ")";
            $scope.classifications["Repair"][toolLabel] = tools;

            toolLabell = "Not fixed by (" + not_fixed_by_nbTools + ")";
            $scope.classifications["Repair"][toolLabell] = not_fixed_by_tools;

            var element = angular.element(document.querySelector('#menu'));
            var height = element[0].offsetHeight;

            angular.element(document.querySelector('#mainTable')).css('height', (height - 160) + 'px');
        });

        $scope.filterName = function(filterKey) {
            for (var j in $scope.classifications) {
                for (var i in $scope.classifications[j]) {
                    if ($scope.classifications[j][i][filterKey] != null) {
                        if ($scope.classifications[j][i][filterKey].fullname) {
                            return $scope.classifications[j][i][filterKey].fullname;
                        }
                        return $scope.classifications[j][i][filterKey].name;
                    }
                }
            }
            return filterKey;
        }

        $scope.openViolation = function(violation) {
            $location.path("/violation/" + violation.project_name + "/" + violation.violation_id);
        };

        $scope.sort = function(sort) {
            if (sort == $scope.sortType) {
                $scope.sortReverse = !$scope.sortReverse;
            } else {
                $scope.sortType = sort;
                $scope.sortReverse = false;
            }
            return false;
        }

        $scope.countViolations = function(key, filter) {
            if (filter.count) {
                return filter.count;
            }
            var count = 0;
            for (var i = 0; i < $scope.violations.length; i++) {
                if ($scope.violations[i][key] === true) {
                    count++;
                }
            }
            filter.count = count;
            return count;
        };

        $scope.clickFilter = function(vKey) {
            if (gtag) {
                gtag('event', vKey, {
                    'event_category': 'Filter',
                    'event_label': $scope.filterNamevKey
                });
            }
        }

        $scope.violationsFilter = function(violation) {
            var allFalse = true;
            for (var i in $scope.filter) {
                if ($scope.filter[i] === true) {
                    allFalse = false;
                    break;
                }
            }
            if (allFalse) {
                return true;
            }

            for (var i in $scope.filter) {
                if ($scope.filter[i] === true) {
                    if (violation[i] === true) {
                        if ($scope.match == "any") {
                            return true;
                        }
                    } else if ($scope.match == "all") {
                        return false;
                    }
                }
            }
            if ($scope.match == "any") {
                return false;
            } else {
                return true;
            }
        };

        $rootScope.$on('new_violation', function(e, violation) {
            var title = "Dissection of " + violation.project_name + " " + violation.violation_id;
            $scope.pageTitle = title;

            if ($window.gtag) {
                $window.gtag('config', 'UA-5954162-27', { 'page_path': $location.path(), 'page_title': title });
            }
        });
    });
